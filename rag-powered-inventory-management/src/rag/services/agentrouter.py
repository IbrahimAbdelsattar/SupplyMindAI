"""AgentRouter chat completion client."""

from __future__ import annotations

import logging
from typing import Any, Dict, Iterable, List

import httpx

from ..core.config import Settings
from ..data.documents import format_context_documents


LOGGER = logging.getLogger(__name__)


class AgentRouterClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._client = httpx.Client(timeout=settings.agentrouter_timeout_seconds, http2=True)

    def close(self) -> None:
        self._client.close()

    def generate_answer(
        self,
        *,
        question: str,
        retrieved_documents: Iterable[Dict[str, Any]],
        selected_sku: str | None,
    ) -> str:
        if not self.settings.agentrouter_api_key:
            raise RuntimeError(
                "AgentRouter API key is missing. Set AGENTROUTER_API_KEY in .env."
            )

        context = format_context_documents(retrieved_documents)
        user_prompt = (
            f"Question:\n{question}\n\n"
            f"Selected SKU:\n{selected_sku or 'None'}\n\n"
            f"Retrieved context:\n{context}\n\n"
            "Answer using only the retrieved context. Keep the answer brief, factual, and do not cite sources."
        )

        models_to_try = [self.settings.agentrouter_model]
        if self.settings.agentrouter_fallback_model not in models_to_try:
            models_to_try.append(self.settings.agentrouter_fallback_model)

        last_error: Exception | None = None
        for model in models_to_try:
            payload = {
                "model": model,
                "temperature": 0.1,
                "max_tokens": self.settings.agentrouter_max_tokens,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are Ask Stock Mind, an inventory analysis assistant. "
                            "Answer only from the provided inventory records. "
                            "Use exact values and dates when available. "
                            "Do not mention sources or citations."
                        ),
                    },
                    {"role": "user", "content": user_prompt},
                ],
            }

            headers = {
                "Authorization": f"Bearer {self.settings.agentrouter_api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": self.settings.agentrouter_site_url,
                "X-Title": self.settings.agentrouter_app_name,
            }

            try:
                response = self._client.post(
                    f"{self.settings.agentrouter_base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                return _extract_message_text(response.json())
            except Exception as exc:  # pragma: no cover - network failures are environment-specific
                LOGGER.warning("AgentRouter request failed for model %s: %s", model, exc)
                last_error = exc

        raise RuntimeError(f"AgentRouter request failed for all configured models: {last_error}")


def _extract_message_text(payload: Dict[str, Any]) -> str:
    choices = payload.get("choices") or []
    if not choices:
        raise RuntimeError("AgentRouter returned no choices.")

    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        text = content.strip()
        if text:
            return text

    if isinstance(content, list):
        text_parts: List[str] = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                text_value = item.get("text")
                if isinstance(text_value, str):
                    text_parts.append(text_value)
        joined = "\n".join(part.strip() for part in text_parts if part.strip()).strip()
        if joined:
            return joined

    raise RuntimeError("AgentRouter returned an empty assistant message.")
