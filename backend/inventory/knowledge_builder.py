"""Inventory Knowledge Document Builder.

Transforms ML pipeline output (forecast + optimization results) into
rich semantic documents ready for embedding. Raw CSV rows are NEVER
embedded directly — only these knowledge documents enter the vector store.

Each document represents ONE product's complete inventory intelligence profile.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from backend.analytics import (
    daily_demand_stats,
    lead_time_days as calc_lead_time,
    latest_inventory_level,
    safety_stock as calc_safety_stock,
)
from backend.globals import STORE

LOGGER = logging.getLogger(__name__)


@dataclass
class InventoryKnowledgeDocument:
    """A complete inventory intelligence profile for one product."""

    document_id: str
    product_id: str
    product_name: str
    warehouse: str
    category: str
    unit_price: float
    current_stock: int
    forecast_demand: float
    forecast_confidence: float
    demand_trend: str
    safety_stock: int
    reorder_point: int
    eoq: int
    reorder_quantity: int
    supplier: str
    lead_time_days: int
    supplier_reliability: float
    delay_risk: str
    days_of_supply: float
    inventory_status: str
    recommendation: str
    recommendation_reason: str
    confidence: float
    working_capital: float
    inventory_turnover: float
    generated_at: str
    source_type: str = "inventory_intelligence"
    alerts: list[str] = field(default_factory=list)

    def to_document_dict(self) -> dict[str, Any]:
        """Convert to a dictionary suitable for ingestion/embedding."""
        return {
            "title": f"Inventory Intelligence: {self.product_name} ({self.product_id})",
            "content": self._build_semantic_text(),
            "source_type": self.source_type,
            "source_id": self.product_id,
            "metadata": {
                "product_id": self.product_id,
                "product_name": self.product_name,
                "warehouse": self.warehouse,
                "category": self.category,
                "inventory_status": self.inventory_status,
                "supplier": self.supplier,
                "confidence": self.confidence,
                "generated_at": self.generated_at,
                "document_type": "inventory_intelligence",
            },
        }

    def _build_semantic_text(self) -> str:
        """Build a natural-language semantic document for embedding."""
        lines = [
            f"Product: {self.product_name}",
            f"Product ID: {self.product_id}",
            f"Warehouse: {self.warehouse}",
            f"Category: {self.category}",
            f"Unit Price: ${self.unit_price:.2f}",
            "",
            "--- Current Stock & Demand ---",
            f"Current Stock: {self.current_stock} units",
            f"Forecast Demand: {self.forecast_demand:.0f} units",
            f"Forecast Confidence: {self.forecast_confidence:.0f}%",
            f"Demand Trend: {self.demand_trend}",
            f"Days of Supply: {self.days_of_supply:.1f} days",
            "",
            "--- Inventory Optimization ---",
            f"Safety Stock: {self.safety_stock} units",
            f"Reorder Point (ROP): {self.reorder_point} units",
            f"Economic Order Quantity (EOQ): {self.eoq} units",
            f"Recommended Reorder Quantity: {self.reorder_quantity} units",
            "",
            "--- Supplier Intelligence ---",
            f"Supplier: {self.supplier}",
            f"Lead Time: {self.lead_time_days} days",
            f"Supplier Reliability: {self.supplier_reliability:.1f}%",
            f"Delay Risk: {self.delay_risk}",
            "",
            "--- Inventory Health ---",
            f"Inventory Status: {self.inventory_status}",
            f"Inventory Turnover: {self.inventory_turnover:.2f}",
            f"Working Capital: ${self.working_capital:,.2f}",
            f"Recommendation: {self.recommendation}",
            f"Reason: {self.recommendation_reason}",
            f"Confidence: {self.confidence:.0f}%",
        ]
        if self.alerts:
            lines.append("")
            lines.append("--- Active Alerts ---")
            lines.extend(f"- {alert}" for alert in self.alerts)
        return "\n".join(lines)


def _determine_inventory_status(
    current_stock: int,
    reorder_point: int,
    safety_stock: int,
    days_of_supply: float,
    forecast_demand: float,
) -> tuple[str, str, str]:
    """Determine inventory status, recommendation, and reason."""
    if current_stock <= 0:
        return (
            "Stockout",
            "Order Immediately — Emergency Replenishment",
            "Stock is depleted. Immediate order required to avoid complete stockout.",
        )
    if current_stock <= safety_stock:
        return (
            "Critical",
            f"Order {max(int(forecast_demand * 1.5), int(reorder_point * 1.2))} units urgently",
            f"Stock ({current_stock}) is below safety stock ({safety_stock}). "
            f"Forecast demand ({forecast_demand:.0f}) exceeds available inventory.",
        )
    if current_stock <= reorder_point:
        return (
            "High Priority",
            f"Order {int(reorder_point * 1.5)} units soon",
            f"Stock ({current_stock}) is below reorder point ({reorder_point}). "
            f"Reorder to maintain optimal inventory levels.",
        )
    if days_of_supply > 90:
        return (
            "Overstocked",
            "Reduce stock — pause ordering",
            f"Stock level ({current_stock}) provides {days_of_supply:.0f} days of supply, "
            f"exceeding 90-day threshold. Consider promotions or write-offs.",
        )
    if days_of_supply > 60:
        return (
            "Well Stocked",
            "Monitor — no immediate action needed",
            f"Stock level ({current_stock}) provides {days_of_supply:.0f} days of supply. "
            f"Healthy but approaching overstock threshold.",
        )
    return (
        "Healthy",
        "No action needed",
        f"Stock level ({current_stock}) is healthy with {days_of_supply:.0f} days of supply. "
        f"Continue normal operations.",
    )


def _compute_inventory_turnover(current_stock: float, forecast_demand: float) -> float:
    """Estimate inventory turnover (annual)."""
    if current_stock <= 0 or forecast_demand <= 0:
        return 0.0
    annual_demand = forecast_demand * 12
    return annual_demand / current_stock


def _get_supplier_info(product_id: str) -> dict[str, Any]:
    """Retrieve supplier information for a product."""
    try:
        sup = STORE.suppliers()
        if sup.empty:
            return {"name": "Unknown", "reliability": 0.0, "delay_risk": "unknown"}
        bom = STORE.bom()
        bom_sub = bom[bom["product_id"] == product_id]
        if not bom_sub.empty:
            material_ids = bom_sub["material_id"].unique()
            raw = STORE.raw_materials()
            raw_sub = raw[raw["material_id"].isin(material_ids)]
            if not raw_sub.empty:
                supplier_ids = raw_sub["supplier_id"].unique()
                sup_sub = sup[sup["supplier_id"].isin(supplier_ids)]
                if not sup_sub.empty:
                    best = sup_sub.iloc[0]
                    name_col = "supplier_name" if "supplier_name" in sup_sub.columns else "supplier_id"
                    reliability = float(best.get("reliability_score", best.get("reliability", 0)))
                    delay = "low" if reliability > 85 else "medium" if reliability > 70 else "high"
                    return {"name": str(best.get(name_col, "Unknown")), "reliability": reliability, "delay_risk": delay}
        first = sup.iloc[0]
        name_col = "supplier_name" if "supplier_name" in sup.columns else "supplier_id"
        reliability = float(first.get("reliability_score", first.get("reliability", 0)))
        delay = "low" if reliability > 85 else "medium" if reliability > 70 else "high"
        return {"name": str(first.get(name_col, "Unknown")), "reliability": reliability, "delay_risk": delay}
    except Exception as exc:
        LOGGER.debug("Supplier lookup failed for %s: %s", product_id, exc)
        return {"name": "Unknown", "reliability": 0.0, "delay_risk": "unknown"}


def build_inventory_knowledge_document(
    product_id: str,
    forecast_demand: float | None = None,
    forecast_confidence: float | None = None,
    demand_trend: str | None = None,
) -> InventoryKnowledgeDocument | None:
    """Build an inventory knowledge document for one product.

    Args:
        product_id: The product to build a document for.
        forecast_demand: Optional forecast demand (units/month).
        forecast_confidence: Optional forecast confidence (0-100).
        demand_trend: Optional trend direction.

    Returns:
        An InventoryKnowledgeDocument ready for embedding, or None.
    """
    try:
        products = STORE.products()
        inv = STORE.inventory()
        prod_row = products[products["product_id"] == product_id]
        if prod_row.empty:
            LOGGER.warning("Product %s not found", product_id)
            return None

        prod = prod_row.iloc[0]
        product_name = str(prod.get("product_name", product_id))
        category = str(prod.get("category", "Uncategorized"))
        unit_price = float(prod.get("max_price", prod.get("unit_price", 0)))

        inv_sub = inv[inv["product_id"] == product_id]
        warehouse = "Default"
        if not inv_sub.empty:
            latest_inv = inv_sub.sort_values("date").iloc[-1]
            warehouse = str(latest_inv.get("warehouse", latest_inv.get("location", "Default")))

        current_stock = latest_inventory_level(STORE, product_id)
        mean_d, std_d = daily_demand_stats(STORE, product_id)

        forecast_demand_val = forecast_demand or (mean_d * 30.0)
        forecast_confidence_val = forecast_confidence or 85.0
        demand_trend_val = demand_trend or "stable"

        lead_time = calc_lead_time(STORE, product_id)
        safety = calc_safety_stock(std_d, lead_time)
        rop = int(round(mean_d * lead_time + safety))
        annual_demand = mean_d * 365.0
        S, H = 50.0, max(1.0, 0.2 * max(unit_price, 1.0))
        eoq = int(round(((2 * annual_demand * S) / H) ** 0.5)) if annual_demand > 0 else 0
        reorder_qty = max(eoq, max(0, rop - current_stock))

        days_supply = (current_stock / mean_d) if mean_d > 0 else 0.0
        status, recommendation, reason = _determine_inventory_status(
            current_stock, rop, safety, days_supply, forecast_demand_val
        )
        supplier_info = _get_supplier_info(product_id)
        working_capital = current_stock * unit_price
        turnover = _compute_inventory_turnover(current_stock, forecast_demand_val)

        alerts = []
        if current_stock <= safety:
            alerts.append("CRITICAL: Stock below safety stock level")
        if current_stock <= rop:
            alerts.append("WARNING: Stock below reorder point")
        if days_supply > 90:
            alerts.append("WARNING: Overstocked — over 90 days of supply")
        if lead_time > 14:
            alerts.append("SUPPLIER RISK: Lead time exceeds 14-day threshold")
        if supplier_info["delay_risk"] == "high":
            alerts.append("SUPPLIER RISK: High delay risk detected")
        if turnover < 2.0:
            alerts.append("SLOW MOVING: Inventory turnover below 2x/year")

        return InventoryKnowledgeDocument(
            document_id=str(uuid.uuid4()),
            product_id=product_id,
            product_name=product_name,
            warehouse=warehouse,
            category=category,
            unit_price=unit_price,
            current_stock=current_stock,
            forecast_demand=forecast_demand_val,
            forecast_confidence=forecast_confidence_val,
            demand_trend=demand_trend_val,
            safety_stock=safety,
            reorder_point=rop,
            eoq=eoq,
            reorder_quantity=reorder_qty,
            supplier=supplier_info["name"],
            lead_time_days=lead_time,
            supplier_reliability=supplier_info["reliability"],
            delay_risk=supplier_info["delay_risk"],
            days_of_supply=days_supply,
            inventory_status=status,
            recommendation=recommendation,
            recommendation_reason=reason,
            confidence=forecast_confidence_val,
            working_capital=working_capital,
            inventory_turnover=turnover,
            generated_at=datetime.now(timezone.utc).isoformat(),
            alerts=alerts,
        )
    except Exception as exc:
        LOGGER.exception("Failed to build inventory document for %s: %s", product_id, exc)


def build_all_inventory_documents(
    forecast_data: list[dict[str, Any]] | None = None,
) -> list[InventoryKnowledgeDocument]:
    """Build inventory knowledge documents for ALL products.

    Args:
        forecast_data: Optional list of forecast dicts with:
            product_id, predicted_demand, confidence_level, demand_trend.

    Returns:
        A list of InventoryKnowledgeDocument objects, one per product.
    """
    try:
        products = STORE.products()
        if products.empty:
            LOGGER.warning("No products found to build inventory documents")
            return []

        forecast_index: dict[str, dict[str, Any]] = {}
        if forecast_data:
            for f in forecast_data:
                pid = f.get("product_id", "")
                if pid:
                    forecast_index[pid] = f

        documents: list[InventoryKnowledgeDocument] = []
        for product_id in products["product_id"].unique():
            f_data = forecast_index.get(str(product_id), {})
            doc = build_inventory_knowledge_document(
                product_id=str(product_id),
                forecast_demand=f_data.get("predicted_demand"),
                forecast_confidence=f_data.get("confidence_level"),
                demand_trend=f_data.get("demand_trend", "stable"),
            )
            if doc is not None:
                documents.append(doc)

        LOGGER.info(
            "Built %d inventory knowledge documents for %d products",
            len(documents),
            len(products),
        )
        return documents
    except Exception as exc:
        LOGGER.exception("Failed to build all inventory documents: %s", exc)
        return []

        return None

