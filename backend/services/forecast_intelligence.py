from __future__ import annotations


def analyze_product(product_id: str) -> dict:
    return {
        "product_id": product_id,
        "trend": "stable",
        "seasonality": None,
        "status": "Analyze stub — implement with time-series decomposition.",
    }


def generate_scenarios(product_id: str, horizon: int = 30) -> dict:
    return {
        "product_id": product_id,
        "horizon": horizon,
        "scenarios": {"optimistic": {}, "pessimistic": {}, "most_likely": {}},
    }


def detect_anomalies(product_id: str) -> list[dict]:
    return []
