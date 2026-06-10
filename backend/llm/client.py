import os
import logging
from langchain_openai import ChatOpenAI

LOGGER = logging.getLogger(__name__)

def get_llm(temperature: float = 0.1) -> ChatOpenAI:
    """
    Unified client factory to build and return a ChatOpenAI instance.
    Supports OpenRouter, NVIDIA NIM, OpenAI, and custom OpenAI-compatible endpoints.
    Auto-detects provider based on the API key format if base_url is not specified.
    """
    key = (
        os.getenv("LLM_REASONING_API_KEY")
        or os.getenv("RAG_API_KEY")
        or os.getenv("CHATBOT_API_KEY")
        or os.getenv("OPENROUTER_API_KEY")
    )
    if key:
        key = key.strip()

    base_url = os.getenv("LLM_BASE_URL")
    model = os.getenv("LLM_MODEL")

    if key:
        # Auto-detect base_url and model based on the key prefix if not overridden
        if key.startswith("nvapi-"):
            if not base_url:
                base_url = "https://integrate.api.nvidia.com/v1"
            if not model or model == "glm5.1":
                model = "openai/gpt-oss-120b:free"
        if key.startswith("sk-or-"):
            if not base_url:
                base_url = "https://openrouter.ai/api/v1"
            if not model or model == "glm5.1":
                model = "openai/gpt-oss-120b:free"
        elif key.startswith("sk-"):
            # Standard OpenAI key
            if not base_url:
                base_url = None  # Use default OpenAI endpoint
            if not model or model == "glm5.1":
                model = "openai/gpt-4o-mini"

    # Set ultimate fallbacks if still not resolved
    if not base_url and key:
        # Default to OpenRouter for general keys (like the user's OpenRouter key)
        base_url = "https://openrouter.ai/api/v1"
    
    if not model or model == "glm5.1":
        model = "openai/gpt-oss-120b:free"
    LOGGER.info(f"Using model: {model}")

    LOGGER.info(
        "Initializing ChatOpenAI with model=%s, base_url=%s (key_configured=%s)",
        model,
        base_url,
        bool(key),
    )

    # Extra headers for OpenRouter compliance if needed
    extra_headers = {}
    if base_url and "openrouter.ai" in base_url:
        extra_headers = {
            "HTTP-Referer": "https://supplymind.ai",
            "X-Title": "SupplyMind AI",
        }

    return ChatOpenAI(
        model=model,
        api_key=key or "not-set",
        base_url=base_url or None,
        temperature=temperature,
        default_headers=extra_headers if extra_headers else None,
    )


def get_llm_info() -> dict:
    """
    Returns the resolved LLM configuration details (model, base_url, key configuration status).
    """
    key = (
        os.getenv("LLM_REASONING_API_KEY")
        or os.getenv("RAG_API_KEY")
        or os.getenv("CHATBOT_API_KEY")
        or os.getenv("OPENROUTER_API_KEY")
    )
    if key:
        key = key.strip()

    base_url = os.getenv("LLM_BASE_URL")
    model = os.getenv("LLM_MODEL")

    if key:
        # Auto-detect base_url and model based on the key prefix if not overridden
        if key.startswith("nvapi-"):
            if not base_url:
                base_url = "https://integrate.api.nvidia.com/v1"
            if not model or model == "glm5.1":
                model = "openai/gpt-oss-120b:free"
        if key.startswith("sk-or-"):
            if not base_url:
                base_url = "https://openrouter.ai/api/v1"
            if not model or model == "glm5.1":
                model = "openai/gpt-oss-120b:free"
        elif key.startswith("sk-"):
            # Standard OpenAI key
            if not base_url:
                base_url = None  # Use default OpenAI endpoint
            if not model or model == "glm5.1":
                model = "openai/gpt-4o-mini"

    # Set ultimate fallbacks if still not resolved
    if not base_url and key:
        # Default to OpenRouter for general keys (like the user's OpenRouter key)
        base_url = "https://openrouter.ai/api/v1"

    if not model or model == "glm5.1":
        model = "openai/gpt-oss-120b:free"

    return {
        "model": model,
        "base_url": base_url or "https://api.openai.com/v1",
        "api_key_configured": bool(key),
    }

