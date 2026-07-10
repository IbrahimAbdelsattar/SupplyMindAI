import os
import logging
from langchain_openai import ChatOpenAI
from backend.llm.client import _resolve_key, _resolve_provider, _openrouter_headers, _safe_create_chat_openai
from backend.ai.orchestrator.config import config

LOGGER = logging.getLogger(__name__)

class ModelRegistry:
    """Centralized registry for specialized agent LLM models."""

    @staticmethod
    def get_model(agent_type: str, temperature: float | None = None, max_tokens: int | None = None) -> ChatOpenAI | None:
        """Get or create a customized ChatOpenAI client specifically configured for the agent type."""
        key = _resolve_key()
        if not key:
            LOGGER.warning("No LLM API key configured for agent_type '%s'", agent_type)
            return None

        # Resolve provider defaults
        provider, detected_url, detected_model = _resolve_provider(key)
        base_url = detected_url

        # Apply agent-specific defaults
        if agent_type == "inventory":
            model = os.getenv("INVENTORY_MODEL") or os.getenv("LLM_MODEL") or config.INVENTORY_MODEL
            temp = temperature if temperature is not None else config.INVENTORY_TEMP
            tokens = max_tokens if max_tokens is not None else config.INVENTORY_MAX_TOKENS
        elif agent_type == "forecast":
            model = os.getenv("FORECAST_MODEL") or os.getenv("LLM_MODEL") or config.FORECAST_MODEL
            temp = temperature if temperature is not None else config.FORECAST_TEMP
            tokens = max_tokens if max_tokens is not None else config.FORECAST_MAX_TOKENS
        elif agent_type == "customer_support":
            model = os.getenv("SUPPORT_MODEL") or os.getenv("LLM_MODEL") or config.SUPPORT_MODEL
            temp = temperature if temperature is not None else config.SUPPORT_TEMP
            tokens = max_tokens if max_tokens is not None else config.SUPPORT_MAX_TOKENS
        elif agent_type == "executive_insights":
            model = os.getenv("INSIGHTS_MODEL") or os.getenv("LLM_MODEL") or config.INSIGHTS_MODEL
            temp = temperature if temperature is not None else config.INSIGHTS_TEMP
            tokens = max_tokens if max_tokens is not None else config.INSIGHTS_MAX_TOKENS
        elif agent_type == "report":
            model = os.getenv("REPORT_MODEL") or os.getenv("LLM_MODEL") or config.REPORT_MODEL
            temp = temperature if temperature is not None else config.REPORT_TEMP
            tokens = max_tokens if max_tokens is not None else config.REPORT_MAX_TOKENS
        elif agent_type == "security":
            model = os.getenv("SECURITY_MODEL") or os.getenv("LLM_MODEL") or config.SECURITY_MODEL
            temp = temperature if temperature is not None else config.SECURITY_TEMP
            tokens = max_tokens if max_tokens is not None else config.SECURITY_MAX_TOKENS
        elif agent_type == "documentation":
            model = os.getenv("DOCUMENTATION_MODEL") or os.getenv("LLM_MODEL") or config.DOCUMENTATION_MODEL
            temp = temperature if temperature is not None else config.DOCUMENTATION_TEMP
            tokens = max_tokens if max_tokens is not None else config.DOCUMENTATION_MAX_TOKENS
        else:
            model = os.getenv("COPILOT_MODEL") or os.getenv("LLM_MODEL") or config.COPILOT_MODEL
            temp = temperature if temperature is not None else config.COPILOT_TEMP
            tokens = max_tokens if max_tokens is not None else config.COPILOT_MAX_TOKENS

        extra_headers = {}
        if base_url and "openrouter.ai" in base_url:
            extra_headers = _openrouter_headers()
            extra_headers["Authorization"] = f"Bearer {key}"

        timeout = config.DEFAULT_TIMEOUT
        max_retries = config.DEFAULT_MAX_RETRIES

        try:
            LOGGER.info("Initializing registry model for agent_type '%s': %s (temp=%s, tokens=%s)", agent_type, model, temp, tokens)
            return _safe_create_chat_openai(
                model=model,
                api_key=key,
                base_url=base_url,
                temperature=temp,
                extra_headers=extra_headers,
                timeout=timeout,
                max_retries=max_retries,
                max_tokens=tokens,
            )
        except Exception as exc:
            LOGGER.exception("Failed to initialize registry model for agent_type '%s': %s", agent_type, exc)
            return None
