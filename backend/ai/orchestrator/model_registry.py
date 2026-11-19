import os
import logging
from typing import Any, Tuple
from langchain_openai import ChatOpenAI
from backend.llm.client import (
    _resolve_key,
    _resolve_provider,
    _omniroute_headers,
    _openrouter_headers,
    _safe_create_chat_openai,
    DEFAULT_MODEL,
    OMNIROUTE_DEFAULT_BASE_URL,
)
from backend.ai.orchestrator.config import config

LOGGER = logging.getLogger(__name__)

class ModelRegistry:
    """Centralized registry for specialized agent LLM models.

    Every agent dynamically resolves its model, base_url, and api_key from environment variables.
    """

    @staticmethod
    def resolve_agent_env(agent_type: str) -> Tuple[str, str, str | None, float, int]:
        """
        Dynamically resolve (model, base_url, api_key, temperature, max_tokens)
        from environment variables for a given agent_type.
        """
        clean_name = agent_type.upper().replace("-", "_")

        # 1. Resolve agent-specific or global API Key from env
        agent_key = (
            os.getenv(f"{clean_name}_API_KEY")
            or (os.getenv("SUPPORT_API_KEY") or os.getenv("CUSTOMER_SUPPORT_API_KEY") if agent_type in ("customer_support", "support") else None)
            or (os.getenv("INSIGHTS_API_KEY") or os.getenv("EXECUTIVE_INSIGHTS_API_KEY") if agent_type in ("executive_insights", "insights") else None)
            or getattr(config, f"{clean_name}_API_KEY", None)
            or os.getenv("OMNIROUTE_API_KEY")
            or _resolve_key()
        )

        # 2. Resolve agent-specific or global Base URL from env
        default_base_url = (
            os.getenv("OMNIROUTE_BASE_URL")
            or os.getenv("LLM_BASE_URL")
            or getattr(config, "DEFAULT_BASE_URL", OMNIROUTE_DEFAULT_BASE_URL)
        )
        base_url = (
            os.getenv(f"{clean_name}_BASE_URL")
            or (os.getenv("SUPPORT_BASE_URL") or os.getenv("CUSTOMER_SUPPORT_BASE_URL") if agent_type in ("customer_support", "support") else None)
            or (os.getenv("INSIGHTS_BASE_URL") or os.getenv("EXECUTIVE_INSIGHTS_BASE_URL") if agent_type in ("executive_insights", "insights") else None)
            or getattr(config, f"{clean_name}_BASE_URL", None)
            or default_base_url
        )

        # 3. Resolve agent-specific or global Model from env
        default_model = os.getenv("OMNIROUTE_MODEL") or os.getenv("LLM_MODEL") or DEFAULT_MODEL
        if agent_type == "inventory":
            model = os.getenv("INVENTORY_MODEL") or config.INVENTORY_MODEL or default_model
            temp = config.INVENTORY_TEMP
            tokens = config.INVENTORY_MAX_TOKENS
        elif agent_type == "forecast":
            model = os.getenv("FORECAST_MODEL") or config.FORECAST_MODEL or default_model
            temp = config.FORECAST_TEMP
            tokens = config.FORECAST_MAX_TOKENS
        elif agent_type in ("customer_support", "support"):
            model = os.getenv("SUPPORT_MODEL") or os.getenv("CUSTOMER_SUPPORT_MODEL") or config.SUPPORT_MODEL or default_model
            temp = config.SUPPORT_TEMP
            tokens = config.SUPPORT_MAX_TOKENS
        elif agent_type in ("executive_insights", "insights"):
            model = os.getenv("INSIGHTS_MODEL") or os.getenv("EXECUTIVE_INSIGHTS_MODEL") or config.INSIGHTS_MODEL or default_model
            temp = config.INSIGHTS_TEMP
            tokens = config.INSIGHTS_MAX_TOKENS
        elif agent_type == "report":
            model = os.getenv("REPORT_MODEL") or config.REPORT_MODEL or default_model
            temp = config.REPORT_TEMP
            tokens = config.REPORT_MAX_TOKENS
        elif agent_type == "security":
            model = os.getenv("SECURITY_MODEL") or config.SECURITY_MODEL or default_model
            temp = config.SECURITY_TEMP
            tokens = config.SECURITY_MAX_TOKENS
        elif agent_type == "documentation":
            model = os.getenv("DOCUMENTATION_MODEL") or config.DOCUMENTATION_MODEL or default_model
            temp = config.DOCUMENTATION_TEMP
            tokens = config.DOCUMENTATION_MAX_TOKENS
        elif agent_type == "intent_detector":
            model = os.getenv("INTENT_DETECTOR_MODEL") or config.INTENT_DETECTOR_MODEL or default_model
            temp = 0.0
            tokens = 256
        else:
            model = os.getenv(f"{clean_name}_MODEL") or os.getenv("COPILOT_MODEL") or config.COPILOT_MODEL or default_model
            temp = config.COPILOT_TEMP
            tokens = config.COPILOT_MAX_TOKENS

        if model and model.startswith("LLM_MODEL="):
            model = model.replace("LLM_MODEL=", "").strip()

        # If connecting to OmniRoute or local gateway without an explicit key, use fallback
        if not agent_key and base_url and ("omniroute" in base_url or "20128" in base_url or "localhost" in base_url or "127.0.0.1" in base_url):
            agent_key = "omniroute-local-key"

        return model, base_url, agent_key, temp, tokens

    @staticmethod
    def get_model(agent_type: str, temperature: float | None = None, max_tokens: int | None = None) -> ChatOpenAI | None:
        """Get or create a customized ChatOpenAI client specifically configured for the agent type using env vars."""
        model, base_url, key, default_temp, default_tokens = ModelRegistry.resolve_agent_env(agent_type)

        if not key:
            LOGGER.warning("No LLM API key configured for agent_type '%s'", agent_type)
            return None

        temp = temperature if temperature is not None else default_temp
        tokens = max_tokens if max_tokens is not None else default_tokens

        clean_name = agent_type.upper().replace("-", "_")
        timeout = float(os.getenv(f"{clean_name}_TIMEOUT", os.getenv("LLM_TIMEOUT", str(config.DEFAULT_TIMEOUT))))
        max_retries = int(os.getenv(f"{clean_name}_MAX_RETRIES", os.getenv("LLM_MAX_RETRIES", str(config.DEFAULT_MAX_RETRIES))))

        extra_headers = {}
        if base_url:
            if "omniroute" in base_url or "20128" in base_url or "openrouter.ai" in base_url:
                extra_headers = _omniroute_headers()
            if key:
                extra_headers["Authorization"] = f"Bearer {key}"

        try:
            LOGGER.info(
                "Initializing registry model for agent_type '%s': model=%s, base_url=%s, key_set=%s (temp=%s, tokens=%s)",
                agent_type, model, base_url, bool(key), temp, tokens,
            )
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
