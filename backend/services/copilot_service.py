from __future__ import annotations

import logging

from langchain_core.messages import HumanMessage, SystemMessage

from backend.knowledge.langsmith_tracing import configure_langsmith
from backend.llm.client import get_llm

LOGGER = logging.getLogger(__name__)


COPILOT_SYSTEM_PROMPT = """You are SupplyMind AI Copilot.

Your job is to help users understand and navigate the platform.

You explain features, dashboards, metrics, and workflows.

You do not access confidential business data.

You do not answer questions about company-specific inventory, forecasts, suppliers, or internal documents.

If a question requires business data, direct the user to the Inventory Assistant or Forecast Intelligence module."""

class CopilotService:
    def __init__(self) -> None:
        self.llm = get_llm()

    def chat(self, message: str) -> str:
        if not self.llm:
            LOGGER.warning("Copilot LLM is not configured or disabled.")
            return "Copilot service is currently unavailable (LLM disabled)."

        # Enable LangSmith observability/tracing
        configure_langsmith()

        from backend.llm.monitor import monitor_llm_call

        messages = [
            SystemMessage(content=COPILOT_SYSTEM_PROMPT),
            HumanMessage(content=message)
        ]
        
        with monitor_llm_call(feature="copilot_chat", model="platform_guide", provider="openrouter") as ctx:
            response = self.llm.invoke(messages)
            ctx["record_tokens"](response, input_len=len(message), output_len=0)
        return response.content if hasattr(response, "content") else str(response)
