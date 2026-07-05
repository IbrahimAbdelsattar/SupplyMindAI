from __future__ import annotations

import os
import logging
from langchain_openai import ChatOpenAI

LOGGER = logging.getLogger(__name__)

NEMOTRON_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"

FALLBACK_MODELS = [NEMOTRON_MODEL]


def _resolve_key() -> str | None:
    """Resolve LLM API key from env vars (priority order)."""
    for var in (
        "LLM_REASONING_API_KEY",
        "RAG_API_KEY",
        "CHATBOT_API_KEY",
        "OPENROUTER_API_KEY",
        "AGENTROUTER_API_KEY",
        "OPENAI_API_KEY"
    ):
        key = os.getenv(var)
        if key:
            key_str = key.strip()
            if key_str:
                masked = key_str[:8] + "..." + key_str[-4:] if len(key_str) > 12 else "..."
                LOGGER.info("Resolved LLM API key from environment variable '%s': %s", var, masked)
                return key_str
    LOGGER.warning("No LLM API key could be resolved from any expected environment variable.")
    return None


def _resolve_provider(key: str | None) -> tuple[str, str, str]:
    """Detect provider, base_url, and default model."""
    provider = os.getenv("LLM_PROVIDER", "openrouter").strip().lower()
    
    # If key has a known prefix, override provider
    if key:
        if key.startswith("nvapi-"):
            provider = "nvidia"
        elif key.startswith("sk-or-"):
            provider = "openrouter"
        elif key.startswith("sk-"):
            provider = "openai"

    if provider == "nvidia":
        return "nvidia", "https://integrate.api.nvidia.com/v1", NEMOTRON_MODEL
    elif provider == "openai":
        return "openai", "https://api.openai.com/v1", NEMOTRON_MODEL
    else:
        # Default to OpenRouter
        return "openrouter", "https://openrouter.ai/api/v1", NEMOTRON_MODEL


def _openrouter_headers() -> dict[str, str]:
    return {
        "HTTP-Referer": "https://supplymind.ai",
        "X-Title": "SupplyMind AI",
    }


def _safe_create_chat_openai(
    model: str,
    api_key: str,
    base_url: str | None,
    temperature: float,
    extra_headers: dict,
    timeout: float,
    max_retries: int,
    max_tokens: int = 4096,
) -> ChatOpenAI:
    """Instantiate ChatOpenAI using the correct parameter signature for the installed SDK version."""
    try:
        return ChatOpenAI(
            model=model,
            api_key=api_key,
            base_url=base_url or None,
            temperature=temperature,
            max_tokens=max_tokens,
            default_headers=extra_headers or None,
            max_retries=max_retries,
            timeout=timeout,
        )
    except TypeError:
        try:
            return ChatOpenAI(
                model=model,
                api_key=api_key,
                base_url=base_url or None,
                temperature=temperature,
                max_tokens=max_tokens,
                default_headers=extra_headers or None,
                max_retries=max_retries,
                request_timeout=timeout,
            )
        except TypeError:
            return ChatOpenAI(
                model=model,
                api_key=api_key,
                base_url=base_url or None,
                temperature=temperature,
                max_tokens=max_tokens,
                default_headers=extra_headers or None,
                max_retries=max_retries,
            )


from functools import lru_cache

@lru_cache(maxsize=8)
def get_llm(temperature: float = 0.1, max_tokens: int = 4096) -> ChatOpenAI | None:
    """
    Unified client factory. Returns a ChatOpenAI instance or None.
    Auto-detects provider, model, base_url and configuration, applying fallbacks.
    """
    from dotenv import load_dotenv
    from pathlib import Path
    # Resolve the project root (two levels up from this file) to correctly load the top-level .env
    project_root = Path(__file__).resolve().parents[2]
    load_dotenv(project_root / ".env", override=True)

    # Configure LangSmith tracing for all LLM calls
    try:
        from backend.knowledge.langsmith_tracing import configure_langsmith
        configure_langsmith()
    except Exception:
        pass
    
    # Audit log print diagnostics as required by Phase 2
    LOGGER.info("LLM_MODEL=%s", os.getenv("LLM_MODEL"))
    LOGGER.info("OPENROUTER_API_KEY exists=%s", bool(os.getenv("OPENROUTER_API_KEY")))
    LOGGER.info("AGENTROUTER_API_KEY exists=%s", bool(os.getenv("AGENTROUTER_API_KEY")))
    
    key = _resolve_key()
    if not key:
        LOGGER.warning("No LLM API key configured — returning None and disabling AI features")
        return None

    provider, detected_url, detected_model = _resolve_provider(key)
    base_url = os.getenv("LLM_BASE_URL") or detected_url
    model = os.getenv("LLM_MODEL") or detected_model
    
    extra_headers = {}
    if base_url and "openrouter.ai" in base_url:
        extra_headers = _openrouter_headers()
        # OpenRouter requires an explicit Authorization header. LangChain's ChatOpenAI
        # does NOT reliably send the api_key as Authorization when base_url is overridden,
        # so we must set it manually in default_headers to avoid 401 errors.
        if key:
            extra_headers["Authorization"] = f"Bearer {key}"
    
    timeout = float(os.getenv("LLM_TIMEOUT", "30.0"))
    max_retries = int(os.getenv("LLM_MAX_RETRIES", "3"))

    # Try instantiating with resolved config, then fallbacks
    candidate_models = [model] + [m for m in FALLBACK_MODELS if m != model]
    
    for m in candidate_models:
        if not m:
            continue
        try:
            LOGGER.info("Attempting to initialize ChatOpenAI with model: %s", m)
            client = _safe_create_chat_openai(
                model=m,
                api_key=key,
                base_url=base_url,
                temperature=temperature,
                extra_headers=extra_headers,
                timeout=timeout,
                max_retries=max_retries,
                max_tokens=max_tokens,
            )
            return client
        except Exception as exc:
            LOGGER.warning("Failed to initialize ChatOpenAI with model %s: %s. Trying fallback model...", m, exc)
      
    LOGGER.error("All ChatOpenAI models failed to initialize. Returning None.")
    return None


@lru_cache(maxsize=1)
def get_llm_info() -> dict:
    """Returns resolved LLM configuration for diagnostics."""
    from dotenv import load_dotenv
    from pathlib import Path
    project_root = Path(__file__).resolve().parents[2]
    load_dotenv(project_root / ".env", override=True)

    key = _resolve_key()
    if not key:
        return {
            "model": None,
            "base_url": None,
            "api_key_configured": False,
        }
    
    provider, detected_url, detected_model = _resolve_provider(key)
    base_url = os.getenv("LLM_BASE_URL") or detected_url
    model = os.getenv("LLM_MODEL") or detected_model
    
    return {
        "model": model,
        "base_url": base_url,
        "api_key_configured": True,
    }


def is_copilot_enabled() -> bool:
    if os.getenv("ENABLE_COPILOT", "true").lower() not in {"true", "1", "yes", "on"}:
        return False
    return get_llm() is not None


def is_rag_enabled() -> bool:
    if os.getenv("ENABLE_RAG", "true").lower() not in {"true", "1", "yes", "on"}:
        return False
    return get_llm() is not None


def is_ai_insights_enabled() -> bool:
    if os.getenv("ENABLE_AI_INSIGHTS", "true").lower() not in {"true", "1", "yes", "on"}:
        return False
    return get_llm() is not None


def is_forecast_insights_enabled() -> bool:
    if os.getenv("ENABLE_FORECAST_INSIGHTS", "true").lower() not in {"true", "1", "yes", "on"}:
        return False
    return get_llm() is not None
