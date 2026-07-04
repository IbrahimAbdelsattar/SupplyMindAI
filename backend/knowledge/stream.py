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
    """Generates server-sent events (SSE) for copilot chat."""
    
    # Trace/Save initial user message
    _save_conversation_turn(
        user_id=user_id,
        session_id=session_id,
        role="user",
        content=message,
        metadata={"product_id": product_id, "mode": mode, "streamed": True},
    )

    prefix = "[Technical mode] " if mode == "technical" else ""
    enriched = prefix + message

    # SSE Event yielding helper
    def sse_event(event_type: str, data: dict) -> str:
        return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"

    # Send starting status
    yield sse_event("status", {"message": "Initializing copilot..."})

    if _use_langgraph_copilot():
        try:
            from backend.agents.copilot_graph import copilot_graph
            yield sse_event("status", {"message": "Routing via LangGraph supervisor..."})
            
            # Use LangGraph astream_events to catch tokens in real-time
            async for event in copilot_graph.astream_events(
                {
                    "messages": [HumanMessage(content=enriched)],
                    "product_id": product_id or "",
                    "current_intent": "copilot",
                    "tool_call_count": 0,
                },
                version="v2"
            ):
                kind = event.get("event")
                if kind == "on_chat_model_stream":
                    # Yield model tokens
                    chunk = event["data"].get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        yield sse_event("token", {"text": chunk.content})
                elif kind == "on_tool_start":
                    tool_name = event.get("name", "tool")
                    yield sse_event("status", {"message": f"Executing tool: {tool_name}..."})
            
            yield sse_event("done", {})
            return
        except Exception as exc:
            LOGGER.warning("LangGraph streaming failed, falling back to RAG: %s", exc)
            yield sse_event("status", {"message": "LangGraph failed. Falling back to grounded RAG..."})

    # Grounded RAG Fallback
    try:
        from backend.knowledge.config import get_knowledge_settings
        settings = get_knowledge_settings()
        
        context, sources = build_context_block(
            message,
            product_id=product_id,
            user_id=user_id,
            match_count=settings.default_match_count,
        )
        snapshot = get_operational_snapshot(product_id)
        
        yield sse_event("status", {"message": "Synthesizing answer from retrieved snapshot..."})
        
        user_content = f"""QUESTION: {enriched}

CONTEXT (retrieved knowledge):
{context or '(no vector matches)'}

OPERATIONAL_SNAPSHOT:
{snapshot}
"""
        # Call astream on ChatOpenAI
        llm = _llm()
        full_response = []
        async for chunk in llm.astream(
            [SystemMessage(content=GROUNDED_SYSTEM), HumanMessage(content=user_content)]
        ):
            if chunk and hasattr(chunk, "content") and chunk.content:
                full_response.append(chunk.content)
                yield sse_event("token", {"text": chunk.content})
        
        # Save assistant turn
        assistant_text = "".join(full_response)
        _save_conversation_turn(
            user_id=user_id,
            session_id=session_id,
            role="assistant",
            content=assistant_text,
            metadata={"sources": [{"title": s.get("title")} for s in sources] if sources else [], "grounded": bool(sources)},
        )
        
        yield sse_event("done", {})
    except Exception as exc:
        LOGGER.exception("Streaming fallback failed: %s", exc)
        yield sse_event("error", {"message": f"Streaming failed: {exc}"})
