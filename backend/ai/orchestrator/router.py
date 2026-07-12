import os
import time
import logging
from typing import Any, Dict, AsyncGenerator
from backend.guardrails.input_guardrails import InputGuardrails
from backend.ai.orchestrator.intent_detector import IntentDetector
from backend.ai.orchestrator.agent_factory import AgentFactory
from backend.ai.orchestrator.response_validator import ResponseValidator
from backend.ai.orchestrator.config import config
from backend.ai.orchestrator.telemetry import telemetry_logger

LOGGER = logging.getLogger(__name__)

class AIOrchestrator:
    """The central enterprise AI Orchestration Gateway for SupplyMind AI."""

    def __init__(self) -> None:
        self.input_guardrails = InputGuardrails()
        self.intent_detector = IntentDetector()
        self.response_validator = ResponseValidator()

    def execute_query(
        self,
        query: str,
        user_id: str,
        session_id: str,
        product_id: str | None = None,
        mode: str = "business",
    ) -> Dict[str, Any]:
        """Process user request synchronously through the complete orchestration lifecycle."""
        start_time = time.monotonic()
        
        # 1. Guardrail Validation
        guard_result = self.input_guardrails.check(query, user_id=user_id, session_id=session_id)
        if not guard_result.passed:
            LOGGER.warning("Query blocked by input guardrails: %s", query[:200])
            return {
                "answer": "Security check triggered. Your request was flagged as unsafe or contains potential policy violations.",
                "sources": [],
                "grounded": False,
                "engine": "orchestrator"
            }

        # 2. Intent Detection & Routing Override
        # mode="business"  → Inventory / Stock Mind (data + RAG)
        # mode="support"   → Customer service only (no datasets; RESTRICT_CHATBOT default)
        # mode="technical" → allow intent routing to data agents when not restricted
        if mode == "business":
            # Inventory page chatbot: full inventory RAG + tools
            intent = "inventory"
            confidence = 1.0
        elif mode == "support" or os.getenv("RESTRICT_CHATBOT", "true").lower() in {"true", "1", "yes", "on"}:
            # Global floating chatbot: always customer_support (no data isolation bypass)
            intent = "customer_support"
            confidence = 1.0
            product_id = None  # never pass product scope into support
        else:
            intent_info = self.intent_detector.detect_intent(query)
            intent = intent_info.get("intent", "unknown")
            confidence = intent_info.get("confidence", 0.0)

            # 3. Route & Selected Agent (with clarification fallback to Customer Support)
            if confidence < config.INTENT_CONFIDENCE_THRESHOLD or intent == "unknown":
                intent = "customer_support"
                product_id = None

        # 4. Agent Execution
        try:
            agent = AgentFactory.get_agent(intent)
            result = agent.execute(query, user_id, session_id, product_id)
            
            # 5. Output Validation
            validated_answer = self.response_validator.validate_response(
                text=result.get("answer", ""),
                user_id=user_id,
                session_id=session_id
            )
            result["answer"] = validated_answer
            result["engine"] = f"orchestrator:{intent}"

            # 6. Telemetry Logging
            latency = (time.monotonic() - start_time) * 1000
            telemetry_logger.log_routing(
                agent_selected=intent,
                routing_confidence=confidence,
                latency_ms=latency,
                success=True
            )
            return result

        except Exception as exc:
            LOGGER.exception("Orchestration execution failed: %s", exc)
            telemetry_logger.log_routing(
                agent_selected=intent,
                routing_confidence=confidence,
                latency_ms=(time.monotonic() - start_time) * 1000,
                success=False,
                error=str(exc)
            )
            return {
                "answer": f"An error occurred while routing your query: {exc}",
                "sources": [],
                "grounded": False,
                "engine": "orchestrator"
            }

    async def stream_query(
        self,
        query: str,
        user_id: str,
        session_id: str,
        product_id: str | None = None,
        mode: str = "business",
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process user request asynchronously yielding tokens and statuses."""
        start_time = time.monotonic()

        # 1. Guardrail Validation
        guard_result = self.input_guardrails.check(query, user_id=user_id, session_id=session_id)
        if not guard_result.passed:
            yield {"type": "error", "message": "Security check triggered. Your request was flagged as unsafe."}
            return

        # 2. Intent Detection & Routing Override (same rules as execute_query)
        if mode == "business":
            intent = "inventory"
            confidence = 1.0
        elif mode == "support" or os.getenv("RESTRICT_CHATBOT", "true").lower() in {"true", "1", "yes", "on"}:
            intent = "customer_support"
            confidence = 1.0
            product_id = None
        else:
            intent_info = self.intent_detector.detect_intent(query)
            intent = intent_info.get("intent", "unknown")
            confidence = intent_info.get("confidence", 0.0)

            if confidence < config.INTENT_CONFIDENCE_THRESHOLD or intent == "unknown":
                intent = "customer_support"
                product_id = None

        # 4. Stream Execute Agent
        yield {"type": "status", "message": f"Routing query to {intent.replace('_', ' ').title()} Agent..."}

        try:
            agent = AgentFactory.get_agent(intent)
            async for chunk in agent.astream_execute(query, user_id, session_id, product_id):
                # If it's a final result, run validation on the full text
                if chunk["type"] == "result":
                    validated_answer = self.response_validator.validate_response(
                        text=chunk.get("answer", ""),
                        user_id=user_id,
                        session_id=session_id
                    )
                    chunk["answer"] = validated_answer
                    chunk["engine"] = f"orchestrator:{intent}"
                    
                    latency = (time.monotonic() - start_time) * 1000
                    telemetry_logger.log_routing(
                        agent_selected=intent,
                        routing_confidence=confidence,
                        latency_ms=latency,
                        success=True
                    )
                yield chunk

        except Exception as exc:
            LOGGER.exception("Orchestration streaming failed: %s", exc)
            yield {"type": "error", "message": f"Orchestrator error: {exc}"}
