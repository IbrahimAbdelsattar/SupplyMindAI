from __future__ import annotations

import json
import logging
import threading
from typing import Any

import pandas as pd

from backend.globals import STORE, _daily_demand_stats, _latest_inventory_level

LOGGER = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Background-loaded ForecastModel (non-blocking start, waitable)
# ---------------------------------------------------------------------------
_forecast_model = None
_model_lock = threading.Lock()
_model_ready = threading.Event()


def _start_model_load():
    """Start loading ForecastModel in a background daemon thread (non-blocking)."""
    if _model_ready.is_set():
        return

    def _load():
        global _forecast_model
        try:
            import sys
            from pathlib import Path

            proj_root = Path(__file__).resolve().parents[2]
            if str(proj_root) not in sys.path:
                sys.path.insert(0, str(proj_root))

            from ml_platform.models.demand_forecasting_pipeline import ForecastModel

            with _model_lock:
                _forecast_model = ForecastModel.load()
            LOGGER.info("ForecastModel loaded for insight generation")
        except Exception as exc:
            LOGGER.warning("ForecastModel unavailable: %s", exc)
        finally:
            _model_ready.set()

    threading.Thread(target=_load, daemon=True).start()


def _wait_for_model(timeout: float = 15.0) -> Any:
    """Wait up to *timeout* seconds for the model to be ready. Returns model or None."""
    _model_ready.wait(timeout=timeout)
    with _model_lock:
        return _forecast_model


# ---------------------------------------------------------------------------
# Statistical context from CSVs (fast, no ML model needed)
# ---------------------------------------------------------------------------
def _build_statistical_context(product_id: str) -> dict[str, Any]:
    sales = STORE.sales_daily()
    inventory = STORE.inventory()
    products = STORE.products()

    sub_sales = sales[sales["product_id"] == product_id].copy() if not sales.empty else pd.DataFrame()
    product_row = products[products["product_id"] == product_id].iloc[0] if (
        not products.empty and product_id in products["product_id"].values
    ) else {}

    qty_col = "qty" if not sub_sales.empty and "qty" in sub_sales.columns else "total_qty"
    velocity_30 = 0.0
    velocity_prev = 0.0
    velocity_90 = 0.0
    trend_pct = 0.0
    demand_volatility = 0.0

    if not sub_sales.empty and qty_col in sub_sales.columns:
        sub_sales = sub_sales.sort_values("date")
        qty_numeric = pd.to_numeric(sub_sales[qty_col], errors="coerce")
        sub_sales = sub_sales.assign(qty_clean=qty_numeric)

        last_30 = sub_sales.tail(30)
        prev_30 = sub_sales.iloc[-60:-30] if len(sub_sales) >= 60 else pd.DataFrame()
        last_90 = sub_sales.tail(90)

        velocity_30 = float(last_30["qty_clean"].mean()) if not last_30.empty else 0.0
        velocity_prev = float(prev_30["qty_clean"].mean()) if not prev_30.empty else velocity_30
        velocity_90 = float(last_90["qty_clean"].mean()) if not last_90.empty else velocity_30

        if velocity_prev > 0:
            trend_pct = ((velocity_30 - velocity_prev) / velocity_prev) * 100

        if len(last_30) > 1:
            demand_volatility = float(last_30["qty_clean"].std(ddof=1)) / max(velocity_30, 0.01)

    current_stock = _latest_inventory_level(product_id)
    coverage_days = (current_stock / velocity_30) if velocity_30 > 0 else 999
    avg_daily_mean, avg_daily_std = _daily_demand_stats(product_id)

    product_name = str(product_row.get("product_name", product_id)) if isinstance(product_row, dict) else product_id
    category = str(product_row.get("category", "Unknown")) if isinstance(product_row, dict) else "Unknown"
    unit_price = float(product_row.get("unit_price", 0)) if isinstance(product_row, dict) and pd.notna(product_row.get("unit_price")) else 0.0

    return {
        "product_id": product_id,
        "product_name": product_name,
        "category": category,
        "unit_price": unit_price,
        "velocity_30": velocity_30,
        "velocity_prev": velocity_prev,
        "velocity_90": velocity_90,
        "trend_pct": trend_pct,
        "demand_volatility": demand_volatility,
        "current_stock": current_stock,
        "coverage_days": coverage_days,
        "avg_daily_mean": avg_daily_mean,
        "avg_daily_std": avg_daily_std,
    }


# ---------------------------------------------------------------------------
# SHAP extraction (non-blocking — returns empty if model not ready yet)
# ---------------------------------------------------------------------------
def _get_shap_features(product_id: str | None = None, wait: float = 15.0) -> list[dict[str, Any]]:
    """Get SHAP features from the loaded model. Waits up to *wait* seconds."""
    model = _wait_for_model(timeout=wait)
    if model is None:
        return []

    try:
        shap_df = model.get_shap_values(product_id=product_id)
        if shap_df.empty:
            return []
        return [
            {"feature": row["feature"], "importance": float(row["importance"]), "direction": row["direction"]}
            for _, row in shap_df.iterrows()
        ]
    except Exception as exc:
        LOGGER.warning("SHAP extraction failed: %s", exc)
        return []


# ---------------------------------------------------------------------------
# Context assembly for LLM prompt
# ---------------------------------------------------------------------------
def _assemble_context(product_id: str, stats: dict[str, Any], shap_features: list[dict[str, Any]]) -> str:
    lines = [
        f"## Product: {stats['product_name']} ({stats['product_id']})",
        f"**Category:** {stats['category']}",
        f"**Unit Price:** ${stats['unit_price']:.2f}",
        "",
        "## Demand Statistics (Last 30 Days)",
        f"- Average daily demand: {stats['velocity_30']:.1f} units",
        f"- Previous 30-day average: {stats['velocity_prev']:.1f} units",
        f"- 90-day average: {stats['velocity_90']:.1f} units",
        f"- Demand trend: {stats['trend_pct']:+.1f}%",
        f"- Demand volatility (CV): {stats['demand_volatility']:.2f}",
        "",
        "## Inventory Position",
        f"- Current stock: {stats['current_stock']:,} units",
        f"- Coverage at current velocity: {stats['coverage_days']:.1f} days",
    ]

    if stats["coverage_days"] < 14:
        lines.append("- ⚠ CRITICAL: Less than 2 weeks of stock remaining")
    elif stats["coverage_days"] > 90:
        lines.append("- ⚠ WARNING: Over 90 days of excess inventory")

    lines.append("")

    if shap_features:
        lines.append("## SHAP Feature Importance (ML Model)")
        lines.append("The trained XGBoost model identified these as the most influential demand drivers:")
        for i, f in enumerate(shap_features[:10], 1):
            impact_word = "increases" if f["direction"] == "positive" else "decreases"
            lines.append(
                f"  {i}. **{f['feature']}** (importance={f['importance']:.6f}, {impact_word} demand)"
            )
    else:
        lines.append("## SHAP Feature Importance")
        lines.append("ML model is still loading — SHAP data will be available on the next request.")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# LLM invocation — ALWAYS runs (raises on failure, no silent fallback)
# ---------------------------------------------------------------------------
def _invoke_llm(context: str) -> dict[str, Any]:
    """Call the LLM for supply chain reasoning. Raises if LLM not configured."""
    from backend.llm.client import get_llm
    from backend.llm.executive_prompts import SUPPLY_CHAIN_INSIGHTS_PROMPT
    from backend.llm.limits import get_input_budget, truncate_to_budget
    from langchain_core.messages import HumanMessage, SystemMessage

    llm = get_llm(temperature=0.1)
    if llm is None:
        raise RuntimeError(
            "AI Insights requires an LLM. Configure OPENROUTER_API_KEY or LLM_REASONING_API_KEY."
        )

    # Truncate context to token budget
    budget = get_input_budget("ai_insights")
    context = truncate_to_budget(context, budget, label="ai_insights")

    system_msg = SystemMessage(content=SUPPLY_CHAIN_INSIGHTS_PROMPT.format(context=context))
    human_msg = HumanMessage(content="Analyze the supply chain data provided in the system message. Return JSON only.")

    from backend.llm.monitor import monitor_llm_call

    try:
        with monitor_llm_call(feature="ai_insights", model=llm.model_name if hasattr(llm, "model_name") else "unknown", provider="openrouter") as ctx:
            response = llm.invoke([system_msg, human_msg])
            ctx["record_tokens"](response, input_len=len(context), output_len=0)
        content = response.content if hasattr(response, "content") else str(response)

    except Exception as exc:
        raise

    LOGGER.debug("LLM raw response (first 500 chars): %.500s", content)

    # Extract JSON from LLM response (handles markdown fences, preamble text, etc.)
    text = str(content).strip()

    # Try direct parse first
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        # Strip markdown fences
        if "```" in text:
            # Extract content between first ``` and last ```
            parts = text.split("```")
            if len(parts) >= 3:
                text = parts[1]
                if text.startswith(("json\n", "json\r\n")):
                    text = text.split("\n", 1)[-1]
                text = text.strip()
        # Find first { ... last } block
        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace > first_brace:
            text = text[first_brace : last_brace + 1]
        parsed = json.loads(text)

    # Validate the LLM output matches the expected schema
    if not ("insights" in parsed and "executive_summary" in parsed and "recommendations" in parsed):
        raise ValueError(
            f"LLM response missing required keys. Got: {list(parsed.keys())}"
        )

    # Validate each insight has required fields
    for i, insight in enumerate(parsed["insights"]):
        for key in ("title", "description", "impact", "direction", "factor", "confidence"):
            if key not in insight:
                raise ValueError(f"Insight #{i} missing required field: {key}")

    return parsed


# ---------------------------------------------------------------------------
# Public API — LLM is mandatory, SHAP enriches when available
# ---------------------------------------------------------------------------
def generate_insights(product_id: str) -> dict[str, Any]:
    """
    Generate AI insights for a product using LLM reasoning.

    Flow:
      1. Kick off ForecastModel load in background (non-blocking)
      2. Build context from CSV stats immediately
      3. If SHAP data is ready, include it in the context
      4. ALWAYS invoke LLM for reasoning (raises if unavailable)
      5. Parse and return LLM response
    """
    # Step 1: Start model load in background (non-blocking)
    _start_model_load()

    # Step 2: Fast CSV stats (always available)
    stats = _build_statistical_context(product_id)

    # Step 3: SHAP features (available if model loaded, empty if still loading)
    shap_features = _get_shap_features(product_id)

    # Step 4: Assemble context for LLM
    context = _assemble_context(product_id, stats, shap_features)

    # Step 5: LLM reasoning — mandatory
    result = _invoke_llm(context)

    LOGGER.info("LLM-powered insights generated for %s", product_id)
    return result
