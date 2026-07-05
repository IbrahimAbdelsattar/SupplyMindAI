"""Shared SSE streaming utilities for AI Insights and Forecast Reasoning."""

from __future__ import annotations

import json
import logging
import time
from typing import AsyncGenerator, Any

from langchain_core.messages import HumanMessage, SystemMessage
from backend.knowledge.langsmith_tracing import configure_langsmith

configure_langsmith()

try:
    from langsmith import traceable as _traceable
except ImportError:
    def _traceable(*a, **kw):  # type: ignore
        def deco(fn):
            return fn
        return deco

LOGGER = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# SSE event helper (same pattern as knowledge/stream.py)
# ---------------------------------------------------------------------------
def sse_event(event_type: str, data: dict) -> str:
    """Format a server-sent event."""
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


# ---------------------------------------------------------------------------
# Streaming AI Insights
# ---------------------------------------------------------------------------
@_traceable(name="stream_insights", run_type="chain")
async def stream_insights(product_id: str) -> AsyncGenerator[str, None]:
    """Stream AI insights generation as SSE events.

    Event types:
      - status: progress messages
      - token: incremental text chunks from the LLM
      - result: final parsed JSON (insights, executive_summary, recommendations)
      - error: failure message
      - done: stream complete
    """
    from backend.services.insight_service import (
        _start_model_load,
        _build_statistical_context,
        _get_shap_features,
        _assemble_context,
    )
    from backend.ai.orchestrator.model_registry import ModelRegistry
    from backend.ai.orchestrator.prompt_registry import PromptRegistry
    from backend.llm.limits import get_input_budget, truncate_to_budget
    from backend.llm.monitor import monitor_llm_call

    t0 = time.time()

    try:
        # Step 1: Kick off model load (non-blocking)
        _start_model_load()
        yield sse_event("status", {"message": "Building statistical context..."})

        # Step 2: Fast CSV stats
        stats = _build_statistical_context(product_id)

        # Step 3: SHAP features (wait up to 15s)
        yield sse_event("status", {"message": "Extracting ML feature importance..."})
        shap_features = _get_shap_features(product_id, wait=15.0)

        # Step 4: Assemble context
        context = _assemble_context(product_id, stats, shap_features)
        budget = get_input_budget("ai_insights")
        context = truncate_to_budget(context, budget, label="ai_insights")

        # Step 5: Get LLM
        llm = ModelRegistry.get_model("executive_insights")
        if llm is None:
            yield sse_event("error", {"message": "AI Insights requires an LLM. Configure OPENROUTER_API_KEY."})
            yield sse_event("done", {})
            return

        # Step 6: Build messages
        from backend.llm.executive_prompts import SUPPLY_CHAIN_INSIGHTS_PROMPT, INVENTORY_INTELLIGENCE_PROMPT
        base_prompt = PromptRegistry.get_prompt("executive_insights")
        full_system_prompt = base_prompt + "\n\n" + SUPPLY_CHAIN_INSIGHTS_PROMPT.format(context=context)
        system_msg = SystemMessage(content=full_system_prompt)
        human_msg = HumanMessage(content="Analyze the supply chain data provided in the system message. Return JSON only.")
        messages = [system_msg, human_msg]

        # Step 7: Stream LLM response
        yield sse_event("status", {"message": "Generating AI insights..."})
        full_response: list[str] = []

        with monitor_llm_call(
            feature="ai_insights_stream",
            model=llm.model_name if hasattr(llm, "model_name") else "unknown",
            provider="openrouter",
        ) as ctx:
            async for chunk in llm.astream(messages):
                if chunk and hasattr(chunk, "content") and chunk.content:
                    text = chunk.content if isinstance(chunk.content, str) else str(chunk.content)
                    full_response.append(text)
                    yield sse_event("token", {"text": text})

        raw = "".join(full_response)
        ctx["record_tokens"](None, input_len=len(context), output_len=len(raw))
        elapsed = time.time() - t0

        # Step 8: Parse JSON from streamed response
        result = _safe_parse_insights(raw)

        LOGGER.info(
            "Streamed insights for %s in %.1fs (tokens: %d in / %d out)",
            product_id, elapsed, len(context), len(raw),
        )

        yield sse_event("result", result)
        yield sse_event("done", {"elapsed_ms": round(elapsed * 1000)})

    except Exception as exc:
        LOGGER.exception("Streaming insights failed: %s", exc)
        yield sse_event("error", {"message": str(exc)})
        yield sse_event("done", {})


# ---------------------------------------------------------------------------
# Streaming Forecast Reasoning
# ---------------------------------------------------------------------------
@_traceable(name="stream_forecast_reasoning", run_type="chain")
async def stream_forecast_reasoning(
    forecasts: list[dict[str, Any]],
    question: str | None = None,
) -> AsyncGenerator[str, None]:
    """Stream forecast reasoning analysis as SSE events.

    Event types:
      - status: progress messages
      - token: incremental text chunks from the LLM
      - result: final parsed JSON (summary, risks, recommendations, revenue_opportunities)
      - error: failure message
      - done: stream complete
    """
    from backend.ai.orchestrator.model_registry import ModelRegistry
    from backend.ai.orchestrator.prompt_registry import PromptRegistry
    from backend.llm.monitor import monitor_llm_call

    t0 = time.time()

    try:
        llm = ModelRegistry.get_model("forecast")
        if llm is None:
            yield sse_event("error", {"message": "Forecast reasoning requires an LLM."})
            yield sse_event("done", {})
            return

        # Build context from forecasts
        context_lines = []
        for r in forecasts[:15]:
            context_lines.append(
                f"Product ID: {r.get('product_id')}\n"
                f"- Period: {r.get('period')}\n"
                f"- Predicted Demand: {r.get('predicted_demand')} (Confidence: {r.get('confidence_level')})\n"
                f"- Demand Trend: {r.get('demand_trend')}\n"
                f"- Current Stock: {r.get('current_stock')} (Stock Risk Level: {r.get('stock_risk_level')})\n"
                f"- Recommended Order Qty: {r.get('recommended_order_qty')}\n"
                f"- Best Supplier: {r.get('best_supplier')} (Supplier Score: {r.get('supplier_score')})\n"
                f"- Lead Time: {r.get('lead_time_days')} days (Delay Risk: {r.get('delay_risk')}, Avg Delay: {r.get('avg_delay')} days)\n"
                f"- Profit Margin: {r.get('profit_margin')}\n"
                f"- Revenue Forecast: {r.get('revenue_forecast')}"
            )
        context_str = "\n\n".join(context_lines)

        user_message = f"Please analyze these forecasting results:\n\n{context_str}"
        if question:
            user_message += f"\n\nUser Question/Focus: {question}"

        base_prompt = PromptRegistry.get_prompt("forecast")
        from backend.services.forecast_reasoning_service import FORECAST_REASONING_SYSTEM_PROMPT
        full_system_prompt = base_prompt + "\n\n" + FORECAST_REASONING_SYSTEM_PROMPT

        messages = [
            SystemMessage(content=full_system_prompt),
            HumanMessage(content=user_message),
        ]

        yield sse_event("status", {"message": "Analyzing forecast data..."})
        full_response: list[str] = []

        with monitor_llm_call(
            feature="forecast_reasoning_stream",
            model=llm.model_name if hasattr(llm, "model_name") else "unknown",
            provider="openrouter",
        ) as ctx:
            async for chunk in llm.astream(messages):
                if chunk and hasattr(chunk, "content") and chunk.content:
                    text = chunk.content if isinstance(chunk.content, str) else str(chunk.content)
                    full_response.append(text)
                    yield sse_event("token", {"text": text})

        raw = "".join(full_response)
        ctx["record_tokens"](None, input_len=len(user_message), output_len=len(raw))
        elapsed = time.time() - t0

        # Parse JSON
        result = _safe_parse_forecast(raw)

        LOGGER.info(
            "Streamed forecast reasoning in %.1fs (tokens: %d in / %d out)",
            elapsed, len(user_message), len(raw),
        )

        yield sse_event("result", result)
        yield sse_event("done", {"elapsed_ms": round(elapsed * 1000)})

    except Exception as exc:
        LOGGER.exception("Streaming forecast reasoning failed: %s", exc)
        yield sse_event("error", {"message": str(exc)})
        yield sse_event("done", {})


# ---------------------------------------------------------------------------
# JSON parsers (same logic as non-streaming versions)
# ---------------------------------------------------------------------------
def _safe_parse_insights(raw: str) -> dict[str, Any]:
    """Parse LLM response into the insights schema the frontend expects."""
    text = raw.strip()

    # Strip markdown fences
    if "```" in text:
        parts = text.split("```")
        if len(parts) >= 3:
            text = parts[1]
            if text.startswith(("json\n", "json\r\n")):
                text = text.split("\n", 1)[-1]
            text = text.strip()

    # Find JSON block
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        text = text[first_brace : last_brace + 1]

    parsed = json.loads(text)

    if not ("insights" in parsed and "executive_summary" in parsed and "recommendations" in parsed):
        raise ValueError(f"LLM response missing required keys. Got: {list(parsed.keys())}")

    for i, insight in enumerate(parsed["insights"]):
        for key in ("title", "description", "impact", "direction", "factor", "confidence"):
            if key not in insight:
                raise ValueError(f"Insight #{i} missing required field: {key}")

    return parsed


def _safe_parse_forecast(raw: str) -> dict[str, Any]:
    """Parse LLM response into the forecast reasoning schema."""
    text = raw.strip()

    if "```" in text:
        parts = text.split("```")
        if len(parts) >= 3:
            text = parts[1]
            if text.startswith(("json\n", "json\r\n")):
                text = text.split("\n", 1)[-1]
            text = text.strip()

    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        text = text[first_brace : last_brace + 1]

    parsed = json.loads(text)

    # Ensure expected keys exist
    for key in ("summary", "risks", "recommendations", "revenue_opportunities"):
        if key not in parsed:
            parsed[key] = [] if key != "summary" else ""

    return parsed
