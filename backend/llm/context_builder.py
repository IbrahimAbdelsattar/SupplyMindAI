from __future__ import annotations

from typing import Any

import pandas as pd

FORECAST_INTELLIGENCE_CONTEXT_TEMPLATE = """## Forecast Intelligence — {product_id}

| Period | Predicted Demand | Confidence | Trend | Stock | Stock Risk | Reorder Qty | Supplier Score | Lead Time | Delay Risk | Profit Margin | Revenue Forecast |
|--------|-----------------|------------|-------|-------|------------|-------------|----------------|-----------|------------|--------------|-----------------|
{rows}

## Summary Statistics
- **Total Forecast Demand:** {total_demand:,} units
- **Average Confidence Level:** {avg_confidence:.1f}%
- **Current Stock Level:** {current_stock:,} units
- **Stock Risk Level:** {stock_risk}
- **Recommended Reorder Quantity:** {reorder_qty:,} units
- **Supplier Score:** {supplier_score}
- **Lead Time:** {lead_time:.1f} days
- **Delay Risk:** {delay_risk}
- **Profit Margin:** {margin:.1f}%
- **Revenue Forecast:** ${revenue:,.2f}
"""


def build_product_context(product_id: str, forecasts: list[dict[str, Any]]) -> str:
    if not forecasts:
        return f"No forecast data available for product {product_id}."

    df = pd.DataFrame(forecasts)

    rows_lines = []
    for _, r in df.iterrows():
        rows_lines.append(
            f"| {r.get('period', '')} "
            f"| {r.get('predicted_demand', 0):,} "
            f"| {r.get('confidence_level', 0)}% "
            f"| {r.get('demand_trend', 'stable')} "
            f"| {r.get('current_stock', 0):,} "
            f"| {r.get('stock_risk_level', 'unknown')} "
            f"| {r.get('recommended_order_qty', 0):,} "
            f"| {r.get('supplier_score', 0)} "
            f"| {r.get('lead_time_days', 0):.1f} "
            f"| {r.get('delay_risk', 'unknown')} "
            f"| {r.get('profit_margin', 0):.1f}% "
            f"| ${r.get('revenue_forecast', 0):,.2f} |"
        )

    latest = df.iloc[-1] if len(df) > 0 else {}
    total_demand = int(df["predicted_demand"].sum()) if "predicted_demand" in df.columns else 0
    avg_confidence = float(df["confidence_level"].mean()) if "confidence_level" in df.columns else 0
    current_stock = int(latest.get("current_stock", 0))
    stock_risk = str(latest.get("stock_risk_level", "unknown"))
    reorder_qty = int(df["recommended_order_qty"].sum()) if "recommended_order_qty" in df.columns else 0
    supplier_score = str(latest.get("supplier_score", "N/A"))
    lead_time = float(latest.get("lead_time_days", 0))
    delay_risk = str(latest.get("delay_risk", "unknown"))
    margin = float(latest.get("profit_margin", 0))
    revenue = float(df["revenue_forecast"].sum()) if "revenue_forecast" in df.columns else 0

    return FORECAST_INTELLIGENCE_CONTEXT_TEMPLATE.format(
        product_id=product_id,
        rows="\n".join(rows_lines),
        total_demand=total_demand,
        avg_confidence=avg_confidence,
        current_stock=current_stock,
        stock_risk=stock_risk,
        reorder_qty=reorder_qty,
        supplier_score=supplier_score,
        lead_time=lead_time,
        delay_risk=delay_risk,
        margin=margin,
        revenue=revenue,
    )


def build_multi_product_context(products: list[dict[str, Any]], title: str = "Forecast Intelligence Overview") -> str:
    if not products:
        return "No forecast data available."

    df = pd.DataFrame(products)

    if "product_id" not in df.columns:
        return str(df.to_dict(orient="records"))

    lines = [f"# {title}", ""]
    for pid in sorted(df["product_id"].unique()):
        sub = df[df["product_id"] == pid]
        latest = sub.iloc[-1] if len(sub) > 0 else {}
        total_demand = int(sub["predicted_demand"].sum()) if "predicted_demand" in sub.columns else 0
        total_revenue = float(sub["revenue_forecast"].sum()) if "revenue_forecast" in sub.columns else 0
        lines.append(
            f"**{pid}** — Demand: {total_demand:,} units, "
            f"Stock: {int(latest.get('current_stock', 0)):,} ({latest.get('stock_risk_level', 'N/A')}), "
            f"Reorder: {int(sub['recommended_order_qty'].sum()):,}, "
            f"Supplier: {latest.get('best_supplier', 'N/A')} (score: {latest.get('supplier_score', 'N/A')}), "
            f"Revenue: ${total_revenue:,.2f}"
        )

    return "\n".join(lines)
