"""SupplyMind Copilot Streaming Engine."""

from __future__ import annotations

import json
import logging
from typing import AsyncGenerator
from langchain_core.messages import HumanMessage, SystemMessage
from backend.knowledge.copilot import _save_conversation_turn, _use_langgraph_copilot
from backend.knowledge.rag import GROUNDED_SYSTEM, build_context_block, get_operational_snapshot, _llm

LOGGER = logging.getLogger(__name__)

async def stream_copilot_chat(
    message: str,
    user_id: str,
    session_id: str,
    product_id: str | None = None,
    mode: str = "business",
) -> AsyncGenerator[str, None]:
    """Generates server-sent events (SSE) for copilot chat using the AI Orchestrator."""
    def sse_event(event_type: str, data: dict) -> str:
        return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"

    yield sse_event("status", {"message": "Initializing AI Orchestrator..."})

    try:
        from backend.ai.orchestrator.router import AIOrchestrator
        orchestrator = AIOrchestrator()
        
        async for event in orchestrator.stream_query(
            query=message,
            user_id=user_id,
            session_id=session_id,
            product_id=product_id,
            mode=mode,
        ):
            e_type = event.get("type")
            if e_type == "status":
                yield sse_event("status", {"message": event.get("message", "")})
            elif e_type == "token":
                yield sse_event("token", {"text": event.get("text", "")})
            elif e_type == "error":
                yield sse_event("error", {"message": event.get("message", "")})
            elif e_type == "result":
                yield sse_event("result", {
                    "answer": event.get("answer", ""),
                    "sources": event.get("sources", []),
                    "session_id": session_id,
                    "grounded": event.get("grounded", False),
                })
        
        yield sse_event("done", {})
    except Exception as exc:
        LOGGER.exception("Streaming copilot chat failed: %s", exc)
        yield sse_event("error", {"message": f"Streaming failed: {exc}"})
        yield sse_event("done", {})
