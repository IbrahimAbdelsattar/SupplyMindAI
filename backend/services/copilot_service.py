from __future__ import annotations

import os
from langchain_core.messages import SystemMessage, HumanMessage
from backend.integrations.agentrouter import get_agentrouter_llm
from backend.knowledge.langsmith_tracing import configure_langsmith

COPILOT_SYSTEM_PROMPT = """You are SupplyMind AI Copilot.

Your job is to help users understand and navigate the platform.

You explain features, dashboards, metrics, and workflows.

You do not access confidential business data.

You do not answer questions about company-specific inventory, forecasts, suppliers, or internal documents.

If a question requires business data, direct the user to the Inventory Assistant or Forecast Intelligence module."""

class CopilotService:
    def __init__(self) -> None:
        model = os.getenv("COPILOT_MODEL", "glm5.1")
        self.llm = get_agentrouter_llm(model_name=model)

    def chat(self, message: str) -> str:
        # Enable LangSmith observability/tracing
        configure_langsmith()

        messages = [
            SystemMessage(content=COPILOT_SYSTEM_PROMPT),
            HumanMessage(content=message)
        ]
        
        response = self.llm.invoke(messages)
        return response.content if hasattr(response, "content") else str(response)
