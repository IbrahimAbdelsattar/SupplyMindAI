from langchain_core.tools import tool
from pydantic import BaseModel, Field


class InventoryAnalysisInput(BaseModel):
    product_id: str = Field(..., description="The product to analyze inventory health for.")


@tool("analyze_inventory", args_schema=InventoryAnalysisInput)
def analyze_inventory(product_id: str) -> str:
    """Analyzes the current inventory state, stockout risks, overstock risks, and recommended reorder quantities for a product."""
    try:
        from backend.main import STORE
        from backend.analytics import inventory_analysis_text

        return inventory_analysis_text(STORE, product_id)
    except Exception as e:
        return f"Error analyzing inventory for {product_id}: {str(e)}"
