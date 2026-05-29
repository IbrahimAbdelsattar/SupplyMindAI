"""LangGraph tools — Supabase retrieval per agent."""

from __future__ import annotations

from langchain_core.tools import tool
from pydantic import BaseModel, Field

from backend.knowledge.memory import recall_memory
from backend.knowledge.search import semantic_search


class KnowledgeSearchInput(BaseModel):
    query: str = Field(..., description="Semantic search query")
    product_id: str = Field(default="", description="Optional product filter")
    source_type: str = Field(
        default="",
        description="Optional: forecast, inventory, insight, report, mlops",
    )


def _format_hits(hits: list) -> str:
    if not hits:
        return "No matching knowledge found in Supabase."
    lines = []
    for h in hits:
        lines.append(
            f"- [{h.get('source_type')}] {h.get('title')} "
            f"(sim={h.get('similarity', 0):.2f}): {str(h.get('content', ''))[:600]}"
        )
    return "Retrieved knowledge:\n" + "\n".join(lines)


@tool("search_forecast_knowledge", args_schema=KnowledgeSearchInput)
def search_forecast_knowledge(query: str, product_id: str = "", source_type: str = "") -> str:
    """Retrieve historical forecasts and forecast summaries from Supabase."""
    hits = semantic_search(
        query,
        source_type=source_type or "forecast",
        product_id=product_id or None,
        match_count=6,
    )
    return _format_hits(hits)


@tool("search_inventory_knowledge", args_schema=KnowledgeSearchInput)
def search_inventory_knowledge(query: str, product_id: str = "", source_type: str = "") -> str:
    """Retrieve similar inventory incidents and recommendations."""
    hits = semantic_search(
        query,
        source_type=source_type or "inventory",
        product_id=product_id or None,
        match_count=6,
    )
    if not hits:
        hits = semantic_search(query, source_type="incident", product_id=product_id or None, match_count=4)
    return _format_hits(hits)


@tool("search_insights_knowledge", args_schema=KnowledgeSearchInput)
def search_insights_knowledge(query: str, product_id: str = "", source_type: str = "") -> str:
    """Retrieve previous AI explanations and insights."""
    hits = semantic_search(
        query,
        source_type=source_type or "insight",
        product_id=product_id or None,
        match_count=6,
    )
    return _format_hits(hits)


@tool("search_mlops_knowledge", args_schema=KnowledgeSearchInput)
def search_mlops_knowledge(query: str, product_id: str = "", source_type: str = "") -> str:
    """Retrieve drift and retraining history from knowledge base."""
    hits = semantic_search(
        query,
        source_type=source_type or "mlops",
        product_id=product_id or None,
        match_count=6,
    )
    return _format_hits(hits)


@tool("recall_agent_memory", args_schema=KnowledgeSearchInput)
def recall_agent_memory_tool(query: str, product_id: str = "", source_type: str = "") -> str:
    """Recall long-term agent memory relevant to the query."""
    agent = source_type or "copilot"
    mem = recall_memory(query, agent_type=agent if agent in {"forecast", "inventory", "insights", "mlops", "copilot"} else "copilot")
    if not mem:
        return "No agent memory matches."
    return "Agent memory:\n" + "\n".join(f"- {m.get('content', '')[:400]}" for m in mem)
