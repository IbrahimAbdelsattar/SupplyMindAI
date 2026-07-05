import json
import logging
from typing import Dict, Any
from langchain_core.messages import SystemMessage, HumanMessage
from backend.ai.orchestrator.model_registry import ModelRegistry
from backend.ai.orchestrator.config import config
from backend.knowledge.langsmith_tracing import configure_langsmith

configure_langsmith()

try:
    from langsmith import traceable as _traceable
except ImportError:
    def _traceable(*a, **kw):  # type: ignore
        def deco(fn):
            return fn
        return deco

LOGGER = logging.getLogger(__name__)

class IntentDetector:
    """Classifies user query intent and provides a confidence score."""

    INTENT_DETECTION_SYSTEM_PROMPT = """You are the Intent Detection Agent.
Analyze the user's input and classify it into one of these intents:
- `inventory`: Questions about stock levels, reorder quantities, safety stock, warehouse levels, SKU inventory health, and stockouts.
- `forecast`: Questions about future demand predictions, predictions trends, model future horizon, or supplier delay risk.
- `customer_support`: Questions about platform guide, how to use features, dashboard indicators, navigating widgets, or payment/billing.
- `documentation`: Questions explicitly asking for platform policies, user guides, or manuals.
- `reports`: Requests for board-level reports, summaries, weekly logs, or PDF generations.
- `executive_insights`: Strategic summaries, business decisions, revenue opportunities, or demand drivers.
- `settings`: Navigating settings, changing user profiles, password updates, preferences, or toggle options.
- `unknown`: Any query outside inventory/supply chain scope, including: Authentication questions, General SQL questions, Website configuration, Frontend information, Application documentation, Finance outside inventory context, Random company knowledge, Developer documentation, and General enterprise search.

You MUST output ONLY a valid JSON object matching this schema:
{
  "intent": "inventory"|"forecast"|"customer_support"|"documentation"|"reports"|"executive_insights"|"settings"|"unknown",
  "confidence": 0.0 to 1.0,
  "reason": "Short reason why you matched this intent"
}
"""

    def __init__(self) -> None:
        self.model = ModelRegistry.get_model("security", temperature=0.0, max_tokens=256)

    @_traceable(name="detect_intent", run_type="chain")
    def detect_intent(self, text: str) -> Dict[str, Any]:
        """Call the classification model and extract structured intent info."""
        if not self.model:
            LOGGER.warning("Intent detection model unavailable, defaulting to unknown")
            return {"intent": "unknown", "confidence": 0.0, "reason": "Model unavailable"}

        messages = [
            SystemMessage(content=self.INTENT_DETECTION_SYSTEM_PROMPT),
            HumanMessage(content=text)
        ]

        try:
            response = self.model.invoke(messages)
            content = response.content if hasattr(response, "content") else str(response)
            content_str = content.strip()

            # Clean markdown fences
            if content_str.startswith("```"):
                content_str = content_str.split("\n", 1)[-1]
                content_str = content_str.rsplit("```", 1)[0]
            content_str = content_str.strip()

            # Find JSON bounds
            start = content_str.find("{")
            end = content_str.rfind("}")
            if start != -1 and end != -1:
                content_str = content_str[start:end+1]

            parsed = json.loads(content_str)
            intent = parsed.get("intent", "unknown").lower()
            confidence = float(parsed.get("confidence", 0.5))
            reason = parsed.get("reason", "")

            # Safeguard intent values
            allowed = {"inventory", "forecast", "customer_support", "documentation", "reports", "executive_insights", "settings", "unknown"}
            if intent not in allowed:
                intent = "unknown"

            LOGGER.info("Intent detected: %s (confidence: %.2f) - Reason: %s", intent, confidence, reason)
            return {"intent": intent, "confidence": confidence, "reason": reason}

        except Exception as exc:
            LOGGER.error("Intent classification failed: %s", exc)
            return {"intent": "unknown", "confidence": 0.0, "reason": f"Failure: {exc}"}
