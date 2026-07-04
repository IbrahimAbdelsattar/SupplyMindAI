from __future__ import annotations

import json
import logging
import os
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from backend.llm.context_builder import build_multi_product_context, build_product_context
from backend.llm.executive_prompts import (
    EXECUTIVE_INSIGHT_PROMPT,
    EXECUTIVE_SYSTEM_PROMPT,
    HIGH_RISK_INSIGHT_PROMPT,
    REVENUE_INSIGHT_PROMPT,
)
from backend.llm.limits import get_input_budget, get_output_limit, truncate_to_budget

LOGGER = logging.getLogger(__name__)

from backend.llm.client import get_llm

def _get_reasoning_llm(max_tokens: int = 1_024):
    return get_llm(temperature=0.1)



def _safe_parse_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        LOGGER.warning("Failed to parse LLM response as JSON, returning raw text")
        return {"summary": text, "risks": [], "recommendations": [], "revenue_opportunities": []}


def _invoke_llm(system: str, human: str, feature: str = "forecast_reasoning") -> dict[str, Any]:
    llm = _get_reasoning_llm(max_tokens=get_output_limit(feature))
    if llm is None:
        LOGGER.warning("Reasoning LLM is not configured or disabled.")
        return {
            "summary": "Forecast reasoning analysis is currently unavailable (LLM disabled).",
            "risks": [],
            "recommendations": [],
            "revenue_opportunities": [],
        }

    # Truncate context to token budget
    budget = get_input_budget(feature)
    system = truncate_to_budget(system, budget, label=feature)

    from backend.llm.monitor import monitor_llm_call
    from backend.llm.client import _PROVIDER

    messages = [
        SystemMessage(content=system),
        HumanMessage(content=human),
    ]
    try:
        with monitor_llm_call(feature=feature, model="reasoning", provider=_PROVIDER or "unknown") as ctx:
            response = llm.invoke(messages)
            ctx["record_tokens"](response, input_len=len(system), output_len=0)
        content = response.content if hasattr(response, "content") else str(response)
        return _safe_parse_json(str(content))
    except Exception as exc:
        LOGGER.error("LLM invocation failed: %s", exc)
        return {
            "summary": f"Analysis unavailable: {exc}",
            "risks": [],
            "recommendations": [],
            "revenue_opportunities": [],
        }


def generate_executive_insights(
    product_forecasts: list[dict[str, Any]],
    context_str: str | None = None,
) -> dict[str, Any]:
    """Generate executive insights. Context is in system prompt only — human message is instruction-only."""
    if context_str is None:
        context_str = build_multi_product_context(product_forecasts)

    system = EXECUTIVE_SYSTEM_PROMPT.format(context=context_str)
    return _invoke_llm(system, EXECUTIVE_INSIGHT_PROMPT, feature="executive_insights")


def generate_high_risk_insights(
    high_risk_forecasts: list[dict[str, Any]],
) -> dict[str, Any]:
    """High-risk product analysis. Context in system prompt only."""
    context = build_multi_product_context(high_risk_forecasts, title="High-Risk Products")
    return _invoke_llm(
        EXECUTIVE_SYSTEM_PROMPT.format(context=context),
        HIGH_RISK_INSIGHT_PROMPT,
        feature="high_risk_insights",
    )


def generate_revenue_insights(
    revenue_forecasts: list[dict[str, Any]],
) -> dict[str, Any]:
    """Revenue forecast analysis. Context in system prompt only."""
    context = build_multi_product_context(revenue_forecasts, title="Revenue Forecasts")
    return _invoke_llm(
        EXECUTIVE_SYSTEM_PROMPT.format(context=context),
        REVENUE_INSIGHT_PROMPT,
        feature="revenue_insights",
    )


def generate_product_insight(product_id: str, forecasts: list[dict[str, Any]]) -> dict[str, Any]:
    """Single product insight. Context in system prompt only."""
    context = build_product_context(product_id, forecasts)
    return _invoke_llm(
        EXECUTIVE_SYSTEM_PROMPT.format(context=context),
        EXECUTIVE_INSIGHT_PROMPT,
        feature="executive_insights",
    )
