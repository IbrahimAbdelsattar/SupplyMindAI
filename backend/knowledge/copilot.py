"""SupplyMind Copilot — multi-source grounded assistant."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from backend.knowledge.client import get_supabase_client, is_supabase_available
from backend.knowledge.langsmith_tracing import configure_langsmith, trace_run
from backend.knowledge.memory import recall_memory, upsert_memory
from backend.knowledge.rag import get_operational_snapshot, rag_query
from backend.knowledge.search import semantic_search

LOGGER = logging.getLogger(__name__)


def _save_conversation_turn(
    *,
    user_id: str,
    session_id: str,
    role: str,
    content: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    if not is_supabase_available():
        return
    client = get_supabase_client()
    if client is None:
        return
    try:
        client.table("conversations").insert(
            {
                "user_id": user_id,
                "session_id": session_id,
                "role": role,
                "content": content,
                "metadata": metadata or {},
            }
        ).execute()
    except Exception as exc:
        LOGGER.warning("Conversation persist failed: %s", exc)


def _use_langgraph_copilot() -> bool:
    import os

    return os.getenv("COPILOT_USE_LANGGRAPH", "true").strip().lower() in {"1", "true", "yes", "on"}


def copilot_chat(
    *,
    message: str,
    user_id: str,
    session_id: str | None = None,
    product_id: str | None = None,
    mode: str = "business",
) -> dict[str, Any]:
    configure_langsmith()
    session_id = session_id or str(uuid.uuid4())

    prefix = "[Technical mode] " if mode == "technical" else ""
    enriched = prefix + message

    if _use_langgraph_copilot():
        try:
            from backend.agents.copilot_graph import run_copilot_graph

            graph_result = run_copilot_graph(enriched, product_id or "")
            return {
                "answer": graph_result.get("answer", ""),
                "sources": graph_result.get("sources", []),
                "session_id": session_id,
                "grounded": True,
                "engine": "langgraph",
            }
        except Exception as exc:
            LOGGER.warning("LangGraph copilot failed, falling back to RAG: %s", exc)

    with trace_run(
        "copilot_chat",
        metadata={"user_id": user_id, "product_id": product_id, "mode": mode},
    ):
        _save_conversation_turn(
            user_id=user_id,
            session_id=session_id,
            role="user",
            content=message,
            metadata={"product_id": product_id, "mode": mode},
        )

        # Broad retrieval across knowledge types
        all_hits: list[dict[str, Any]] = []
        for st in (None, "forecast", "inventory", "insight", "report", "mlops"):
            all_hits.extend(
                semantic_search(message, source_type=st, product_id=product_id, user_id=user_id, match_count=3)
            )
        # Deduplicate by document_id, keep best similarity
        by_doc: dict[str, dict[str, Any]] = {}
        for h in all_hits:
            did = str(h.get("document_id", ""))
            if did and (did not in by_doc or h.get("similarity", 0) > by_doc[did].get("similarity", 0)):
                by_doc[did] = h
        top_hits = sorted(by_doc.values(), key=lambda x: x.get("similarity", 0), reverse=True)[:8]

        memories = recall_memory(message, agent_type="copilot", user_id=user_id, limit=3)
        snapshot = get_operational_snapshot(product_id)

        rag_result = rag_query(
            enriched,
            product_id=product_id,
            user_id=user_id,
            operational_context=True,
        )

        if memories:
            mem_text = "\n".join(f"- {m.get('content', '')[:400]}" for m in memories)
            rag_result["answer"] = (
                rag_result.get("answer", "")
                + "\n\nRelevant agent memory:\n"
                + mem_text
            )

        if top_hits and not rag_result.get("sources"):
            rag_result["sources"] = [
                {"title": h.get("title"), "source_type": h.get("source_type"), "similarity": h.get("similarity")}
                for h in top_hits
            ]

        _save_conversation_turn(
            user_id=user_id,
            session_id=session_id,
            role="assistant",
            content=rag_result.get("answer", ""),
            metadata={"sources": rag_result.get("sources", []), "grounded": rag_result.get("grounded")},
        )

        upsert_memory(
            agent_type="copilot",
            memory_key=f"session:{session_id}:last",
            content=f"Q: {message[:500]}\nA: {rag_result.get('answer', '')[:800]}",
            user_id=user_id,
            metadata={"product_id": product_id},
        )

        return {
            "answer": rag_result.get("answer", ""),
            "sources": rag_result.get("sources", []),
            "session_id": session_id,
            "grounded": rag_result.get("grounded", False),
            "operational_snapshot_included": bool(snapshot),
        }
