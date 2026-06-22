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

LOGGER = logging.getLogger(__name__)

from backend.llm.client import get_llm

def _get_reasoning_llm():
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


def _invoke_llm(system: str, human: str) -> dict[str, Any]:
    llm = _get_reasoning_llm()
    if llm is None:
        LOGGER.warning("Reasoning LLM is not configured or disabled.")
        return {
            "summary": "Forecast reasoning analysis is currently unavailable (LLM disabled).",
            "risks": [],
            "recommendations": [],
            "revenue_opportunities": [],
        }
    messages = [
        SystemMessage(content=system),
        HumanMessage(content=human),
    ]
    try:
        response = llm.invoke(messages)
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
    if context_str is None:
        context_str = build_multi_product_context(product_forecasts)

    system = EXECUTIVE_SYSTEM_PROMPT.format(context=context_str)
    return _invoke_llm(system, EXECUTIVE_INSIGHT_PROMPT.format(context=context_str))


def generate_high_risk_insights(
    high_risk_forecasts: list[dict[str, Any]],
) -> dict[str, Any]:
    context = build_multi_product_context(high_risk_forecasts, title="High-Risk Products")
    return _invoke_llm(
        EXECUTIVE_SYSTEM_PROMPT.format(context=context),
        HIGH_RISK_INSIGHT_PROMPT.format(context=context),
    )


def generate_revenue_insights(
    revenue_forecasts: list[dict[str, Any]],
) -> dict[str, Any]:
    context = build_multi_product_context(revenue_forecasts, title="Revenue Forecasts")
    return _invoke_llm(
        EXECUTIVE_SYSTEM_PROMPT.format(context=context),
        REVENUE_INSIGHT_PROMPT.format(context=context),
    )


def generate_product_insight(product_id: str, forecasts: list[dict[str, Any]]) -> dict[str, Any]:
    context = build_product_context(product_id, forecasts)
    return _invoke_llm(
        EXECUTIVE_SYSTEM_PROMPT.format(context=context),
        EXECUTIVE_INSIGHT_PROMPT.format(context=context),
    )
