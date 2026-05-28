from langchain_core.tools import tool
from pydantic import BaseModel, Field

class MLOpsInput(BaseModel):
    check_type: str = Field(default="drift", description="Type of metric to fetch: 'drift', 'accuracy', or 'system'")

@tool("get_mlops_metrics", args_schema=MLOpsInput)
def get_mlops_metrics(check_type: str = "drift") -> str:
    """Fetches real-time operational health, model accuracy trends, and data drift metrics for the ML pipeline."""
    if check_type == "accuracy":
        return "Model Accuracy Trend: Average 94.2% WAPE over the last 30 days. No significant degradation detected."
    elif check_type == "drift":
        return "Data Drift Status:\n- promotions_impact: 0.02 (Healthy)\n- seasonality_index: 0.15 (Warning - Exceeds 0.05 threshold)\n- competitor_pricing: 0.05 (Healthy)"
    elif check_type == "system":
        return "System Resources:\n- CPU: 45%\n- Memory: 62%\n- GPU: 25%"
    else:
        return f"Unknown check_type '{check_type}'. Valid options are 'accuracy', 'drift', 'system'."
