from langchain_core.tools import tool
from pydantic import BaseModel, Field

def get_ml_model():
    import sys
    if "backend.main" in sys.modules:
        return sys.modules["backend.main"].ML_MODEL
    return None

class InventoryAnalysisInput(BaseModel):
    product_id: str = Field(..., description="The product to analyze inventory health for.")

@tool("analyze_inventory", args_schema=InventoryAnalysisInput)
def analyze_inventory(product_id: str) -> str:
    """Analyzes the current inventory state, stockout risks, overstock risks, and recommended reorder quantities for a product."""
    model = get_ml_model()
    if not model:
        return "Error: ML model is unavailable to assess inventory optimization."

    try:
        preds_df = model.predict(product_id, n_months=1)
        if preds_df.empty:
            return f"No inventory optimization data available for {product_id}."

        row = preds_df.iloc[0]
        return (
            f"Inventory Analysis for {product_id}:\n"
            f"- Current Stock: {row['current_stock']}\n"
            f"- Recommended Order Qty: {row['recommended_order_qty']}\n"
            f"- Stock Risk Level: {row['stock_risk_level']}\n"
            f"- Supplier Lead Time: {row['lead_time_days']} days\n"
            f"- Delay Risk: {row['delay_risk']}\n"
        )
    except Exception as e:
        return f"Error analyzing inventory for {product_id}: {str(e)}"
