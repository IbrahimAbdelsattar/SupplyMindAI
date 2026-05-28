from langchain_core.tools import tool
from pydantic import BaseModel, Field

def get_ml_model():
    import sys
    if "backend.main" in sys.modules:
        return sys.modules["backend.main"].ML_MODEL
    return None

class ForecastInput(BaseModel):
    product_id: str = Field(..., description="The unique identifier of the product to forecast, e.g. 'BL_KIT', 'FAN_STD'")
    horizon_months: int = Field(default=3, description="Number of months into the future to generate a forecast for.")

@tool("generate_forecast", args_schema=ForecastInput)
def generate_forecast(product_id: str, horizon_months: int = 3) -> str:
    """Generates a multi-month demand forecast for a specific product using the trained XGBoost ML pipeline."""
    model = get_ml_model()
    if not model:
        return "Error: Forecasting ML model is currently not loaded or unavailable."

    try:
        preds_df = model.predict(product_id, n_months=horizon_months)
        output = f"Forecast for product {product_id} over {horizon_months} months:\n"
        for _, row in preds_df.iterrows():
            output += (
                f"- Month: {row['period']}, Predicted Demand: {row['predicted_demand']} units, "
                f"Trend: {row['demand_trend']}, Confidence: {row['confidence_level']}%\n"
            )
        return output
    except Exception as e:
        return f"Failed to generate forecast for {product_id}: {str(e)}"
