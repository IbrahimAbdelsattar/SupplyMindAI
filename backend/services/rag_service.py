from __future__ import annotations

import os
import logging
from langchain_core.messages import SystemMessage, HumanMessage
from backend.llm.client import get_llm
from backend.knowledge.search import semantic_search
from backend.knowledge.rag import get_operational_snapshot
from backend.knowledge.config import get_knowledge_settings
from backend.knowledge.langsmith_tracing import configure_langsmith, trace_run

LOGGER = logging.getLogger(__name__)

RAG_SYSTEM_PROMPT = """You are SupplyMind Inventory Intelligence Assistant.

Answer only using retrieved context.

Never invent information.

If the answer is not available in retrieved documents, say:

"I don't have enough information to answer that question."

Always provide evidence from the retrieved data.

Focus on inventory, suppliers, production, stock levels, demand patterns, and operational risks."""

class RagService:
    def __init__(self) -> None:
        self.llm = get_llm()

    def query(
        self,
        question: str,
        *,
        source_type: str | None = None,
        product_id: str | None = None,
        user_id: str | None = None,
        operational_context: bool = True,
    ) -> dict:
        configure_langsmith()
        settings = get_knowledge_settings()

        with trace_run("inventory_rag_query", metadata={"product_id": product_id, "source_type": source_type}):
            # Retrieve semantically similar documents from Vector Store
            hits = semantic_search(
                question,
                source_type=source_type,
                product_id=product_id,
                user_id=user_id,
                match_count=settings.default_match_count,
            )

            parts = []
            for i, hit in enumerate(hits, 1):
                parts.append(
                    f"[{i}] {hit.get('title')} (type={hit.get('source_type')}, "
                    f"similarity={hit.get('similarity', 0):.2f})\n{hit.get('content', '')[:1500]}"
                )
            context = "\n\n---\n\n".join(parts)

            # Retrieve operational live stats from CSVs
            snapshot = get_operational_snapshot(product_id) if operational_context else ""

            if not context and not snapshot:
                return {
                    "answer": "I don't have enough information to answer that question.",
                    "sources": [],
                    "grounded": False,
                }

            user_content = f"""QUESTION: {question}

CONTEXT (retrieved knowledge):
{context or '(no vector matches)'}

OPERATIONAL_SNAPSHOT:
{snapshot}
"""

            messages = [
                SystemMessage(content=RAG_SYSTEM_PROMPT),
                HumanMessage(content=user_content)
            ]

            if not self.llm:
                LOGGER.warning("RAG LLM is not configured or disabled.")
                answer = "RAG service is currently unavailable (LLM disabled)."
            else:
                try:
                    response = self.llm.invoke(messages)
                    answer = response.content if hasattr(response, "content") else str(response)
                except Exception as exc:
                    LOGGER.exception("RAG LLM execution failed: %s", exc)
                    answer = f"I don't have enough information to answer that question. (System Error: {exc})"

            return {
                "answer": answer,
                "sources": [
                    {
                        "document_id": s.get("document_id"),
                        "title": s.get("title"),
                        "source_type": s.get("source_type"),
                        "similarity": s.get("similarity"),
                    }
                    for s in hits
                ],
                "grounded": bool(hits),
            }
