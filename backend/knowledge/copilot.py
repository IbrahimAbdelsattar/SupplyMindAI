"""SupplyMind Copilot — multi-source grounded assistant."""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from backend.db import Conversation
from backend.knowledge.client import is_knowledge_available, knowledge_session
from backend.knowledge.langsmith_tracing import configure_langsmith, trace_run
from backend.knowledge.memory import recall_memory, upsert_memory
from backend.knowledge.rag import rag_query

LOGGER = logging.getLogger(__name__)


def _save_conversation_turn(
    *,
    user_id: str,
    session_id: str,
    role: str,
    content: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    if not is_knowledge_available():
        return
    try:
        with knowledge_session() as db:
            db.add(
                Conversation(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    session_id=session_id,
                    role=role,
                    content=content,
                    conversation_metadata=metadata or {},
                    created_at=datetime.now(timezone.utc),
                )
            )
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

        # Broad retrieval across knowledge types — delegate to rag_query which already
        # calls semantic_search() + operational snapshot. Avoid duplicate DB queries.
        rag_result = rag_query(
            enriched,
            product_id=product_id,
            user_id=user_id,
            operational_context=True,
        )

        memories = recall_memory(message, agent_type="copilot", user_id=user_id, limit=3)

        if memories:
            mem_text = "\n".join(f"- {m.get('content', '')[:400]}" for m in memories)
            rag_result["answer"] = (
                rag_result.get("answer", "")
                + "\n\nRelevant agent memory:\n"
                + mem_text
            )

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
        }
