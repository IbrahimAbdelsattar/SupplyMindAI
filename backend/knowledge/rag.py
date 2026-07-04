"""Production RAG: grounded retrieval + LangChain generation."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from backend.knowledge.config import get_knowledge_settings
from backend.knowledge.langsmith_tracing import configure_langsmith, trace_run
from backend.knowledge.search import semantic_search
from backend.llm.cache import cached_llm_call, is_cache_enabled
from backend.llm.limits import truncate_to_budget, get_input_budget

LOGGER = logging.getLogger(__name__)

GROUNDED_SYSTEM = """SupplyMind AI supply chain copilot. Answer ONLY from CONTEXT and OPERATIONAL_SNAPSHOT. If context insufficient, state what's missing — never invent metrics/SKUs/dates. Cite source titles. Prefer quantitative facts from operational data. Keep answers concise and actionable."""


from backend.llm.client import get_llm

def _llm(max_tokens: int = 512) -> ChatOpenAI:
    return get_llm(temperature=0.1, max_tokens=max_tokens)



def build_context_block(
    query: str,
    *,
    source_type: str | None = None,
    product_id: str | None = None,
    user_id: str | None = None,
    match_count: int | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    hits = semantic_search(
        query,
        source_type=source_type,
        product_id=product_id,
        user_id=user_id,
        match_count=match_count,
    )
    if not hits:
        return "", []

    parts = []
    for i, hit in enumerate(hits, 1):
        parts.append(
            f"[{i}] {hit.get('title')} (type={hit.get('source_type')}, "
            f"similarity={hit.get('similarity', 0):.2f})\n{hit.get('content', '')[:1500]}"
        )
    return "\n\n---\n\n".join(parts), hits


def get_operational_snapshot(product_id: str | None = None) -> str:
    """Live CSV-backed facts — operational DB remains source of truth."""
    try:
        from backend.main import STORE

        lines = ["Operational snapshot (live data):"]
        prods = STORE.products()
        if product_id:
            prods = prods[prods["product_id"].astype(str) == product_id]
        for _, row in prods.head(5).iterrows():
            pid = str(row.get("product_id", ""))
            mean_d, std_d = _safe_demand_stats(pid)
            inv = _safe_inventory(pid)
            lines.append(
                f"- {pid} {row.get('product_name', '')}: "
                f"avg daily demand≈{mean_d:.1f}, std≈{std_d:.1f}, inventory≈{inv}"
            )
        return "\n".join(lines)
    except Exception as exc:
        return f"Operational snapshot unavailable: {exc}"


def _safe_demand_stats(product_id: str) -> tuple[float, float]:
    from backend.globals import _daily_demand_stats

    return _daily_demand_stats(product_id)


def _safe_inventory(product_id: str) -> float:
    from backend.globals import _latest_inventory_level

    return _latest_inventory_level(product_id)


def rag_query(
    question: str,
    *,
    source_type: str | None = None,
    product_id: str | None = None,
    user_id: str | None = None,
    operational_context: bool = True,
) -> dict[str, Any]:
    configure_langsmith()
    settings = get_knowledge_settings()

    with trace_run("rag_query", metadata={"product_id": product_id, "source_type": source_type}):
        context, sources = build_context_block(
            question,
            source_type=source_type,
            product_id=product_id,
            user_id=user_id,
            match_count=settings.default_match_count,
        )
        snapshot = get_operational_snapshot(product_id) if operational_context else ""

        # Truncate context to token budget
        budget = get_input_budget("rag_query")
        context = truncate_to_budget(context, budget, label="rag_query")

        if not context and not snapshot:
            return {
                "answer": (
                    "I don't have indexed knowledge for that question yet. "
                    "Run forecasts, inventory optimization, or generate insights to populate the knowledge base."
                ),
                "sources": [],
                "grounded": False,
            }

        user_content = f"""QUESTION: {question}

CONTEXT (retrieved knowledge):
{context or '(no vector matches)'}

OPERATIONAL_SNAPSHOT:
{snapshot}
"""

        try:
            from backend.llm.monitor import monitor_llm_call
            llm = _llm()
            with monitor_llm_call(feature="rag_query", model="rag", provider="openrouter") as ctx:
                response = llm.invoke(
                    [SystemMessage(content=GROUNDED_SYSTEM), HumanMessage(content=user_content)]
                )
                ctx["record_tokens"](response, input_len=len(user_content), output_len=0)
            answer = response.content if hasattr(response, "content") else str(response)
        except Exception as exc:
            LOGGER.exception("RAG LLM failed: %s", exc)
            if context:
                answer = (
                    "Retrieved knowledge (LLM unavailable):\n\n"
                    + context[:3000]
                    + f"\n\n(Error: {exc})"
                )
            else:
                answer = f"Unable to generate answer: {exc}"

        return {
            "answer": answer,
            "sources": [
                {
                    "document_id": s.get("document_id"),
                    "title": s.get("title"),
                    "source_type": s.get("source_type"),
                    "similarity": s.get("similarity"),
                }
                for s in sources
            ],
            "grounded": bool(sources),
        }


def format_sources_for_prompt(sources: list[dict[str, Any]]) -> str:
    return json.dumps(sources, default=str)
