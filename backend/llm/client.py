import os
import logging
from langchain_openai import ChatOpenAI

LOGGER = logging.getLogger(__name__)

DEFAULT_MODEL = "openai/gpt-oss-120b:free"


def _resolve_key() -> str | None:
    """Resolve LLM API key from env vars (priority order)."""
    for var in ("LLM_REASONING_API_KEY", "RAG_API_KEY", "CHATBOT_API_KEY", "OPENROUTER_API_KEY"):
        key = os.getenv(var)
        if key:
            return key.strip()
    return None


def _resolve_provider(key: str) -> tuple[str, str]:
    """Detect provider base_url and default model from key prefix."""
    if key.startswith("nvapi-"):
        return "https://integrate.api.nvidia.com/v1", DEFAULT_MODEL
    if key.startswith("sk-or-"):
        return "https://openrouter.ai/api/v1", DEFAULT_MODEL
    if key.startswith("sk-"):
        return "https://api.openai.com/v1", "openai/gpt-4o-mini"
    # Unknown key prefix — default to OpenRouter
    return "https://openrouter.ai/api/v1", DEFAULT_MODEL


def _openrouter_headers() -> dict[str, str]:
    return {
        "HTTP-Referer": "https://supplymind.ai",
        "X-Title": "SupplyMind AI",
    }


def get_llm(temperature: float = 0.1) -> ChatOpenAI:
    """
    Unified client factory. Returns a ChatOpenAI instance.
    Auto-detects provider based on API key prefix.
    """
    key = _resolve_key()
    base_url = os.getenv("LLM_BASE_URL")
    model = os.getenv("LLM_MODEL")

    if key:
        # Auto-detect if not explicitly set
        if not base_url or not model:
            detected_url, detected_model = _resolve_provider(key)
            base_url = base_url or detected_url
            model = model or detected_model
    else:
        LOGGER.warning("No LLM API key configured — calls will fail")

    LOGGER.info("Using model: %s", model)

    extra_headers = _openrouter_headers() if base_url and "openrouter.ai" in base_url else {}

    return ChatOpenAI(
        model=model,
        api_key=key or "not-set",
        base_url=base_url or None,
        temperature=temperature,
        default_headers=extra_headers or None,
    )


def get_llm_info() -> dict:
    """Returns resolved LLM configuration for diagnostics."""
    key = _resolve_key()
    base_url = os.getenv("LLM_BASE_URL")
    model = os.getenv("LLM_MODEL")

    if key and (not base_url or not model):
        detected_url, detected_model = _resolve_provider(key)
        base_url = base_url or detected_url
        model = model or detected_model

    return {
        "model": model or DEFAULT_MODEL,
        "base_url": base_url or "https://api.openai.com/v1",
        "api_key_configured": bool(key),
    }
