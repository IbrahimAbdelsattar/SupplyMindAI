from __future__ import annotations

import os
import logging
from langchain_openai import ChatOpenAI

LOGGER = logging.getLogger(__name__)

def get_agentrouter_llm(model_name: str, temperature: float = 0.15) -> ChatOpenAI:
    """
    Factory function to configure and return a ChatOpenAI client using the unified
    AgentRouter API key and base URL.
    """
    api_key = os.getenv("AGENTROUTER_API_KEY") or os.getenv("CHATBOT_API_KEY")
    if api_key:
        api_key = api_key.strip()
        
    base_url = os.getenv("AGENTROUTER_BASE_URL") or os.getenv("CHATBOT_BASE_URL", "https://agentrouter.org")
    if base_url:
        base_url = base_url.strip()
        # Standardize OpenRouter/AgentRouter endpoint format.
        # OpenAI-compatible clients like ChatOpenAI expect endpoints to end with /v1
        # if the service itself routes /v1. AgentRouter uses /v1 for API routing.
        if "agentrouter.org" in base_url and not base_url.endswith("/v1"):
            base_url = base_url.rstrip("/") + "/v1"
            
    LOGGER.info("Initializing AgentRouter LLM using model %s and endpoint %s", model_name, base_url)
    
    return ChatOpenAI(
        model=model_name,
        api_key=api_key or "not-set",
        base_url=base_url if api_key else None,
        temperature=temperature,
        default_headers={
            "User-Agent": "claude-cli/1.0.108 (external, cli)",
            "anthropic-version": "2023-06-01",
            "HTTP-Referer": "https://agentrouter.org",
            "X-Title": "SupplyMind AI",
        }
    )
