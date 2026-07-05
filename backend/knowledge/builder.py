"""Inventory Knowledge Builder.

Converts raw database rows and forecast results into semantic text documents 
for embedding. This ensures the Intelligence Engine reasons over structured
product snapshots instead of raw CSV rows.
"""

from typing import Any, Dict, Optional
import logging
from backend.knowledge.ingestion import ingest_inventory_knowledge_document

LOGGER = logging.getLogger(__name__)

def build_and_ingest_inventory_knowledge(
    product_id: str,
    product_name: str,
    warehouse: str,
    current_stock: float,
    forecast_demand: float,
    safety_stock: float,
    reorder_point: float,
    eoq: float,
    supplier: str,
    lead_time_days: int,
    inventory_status: str,
    recommendation: str,
    reason: str,
    confidence_pct: int,
    category: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Builds a semantic inventory document and ingests it into the vector DB."""
    
    # Construct the semantic document following the strict format
    document_content = f"""Product Name
{product_name}
Warehouse
{warehouse}
Current Stock
{int(current_stock)} Units
Forecast Demand
{int(forecast_demand)} Units
Safety Stock
{int(safety_stock)} Units
Reorder Point
{int(reorder_point)} Units
EOQ
{int(eoq)} Units
Supplier
{supplier}
Lead Time
{lead_time_days} Days
Inventory Status
{inventory_status}
Recommendation
{recommendation}
Reason
{reason}
Confidence
{confidence_pct}%"""

    # Prepare metadata for filtering
    metadata = {
        "product_id": product_id,
        "warehouse": warehouse,
        "category": category or "Uncategorized",
        "supplier": supplier
    }

    try:
        result = ingest_inventory_knowledge_document(
            product_id=product_id,
            content=document_content,
            title=f"Inventory Intelligence: {product_name} ({product_id})",
            metadata=metadata
        )
        LOGGER.info(f"Ingested inventory knowledge for {product_id}")
        return result
    except Exception as e:
        LOGGER.error(f"Failed to ingest knowledge for {product_id}: {e}")
        return None
