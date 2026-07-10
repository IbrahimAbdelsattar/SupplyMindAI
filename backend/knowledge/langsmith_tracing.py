"""LangSmith tracing helpers for knowledge / copilot flows."""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Any, Generator

from backend.knowledge.config import get_knowledge_settings


def configure_langsmith() -> None:
    settings = get_knowledge_settings()
    if not settings.langsmith_enabled:
        return
    
    # Propagate API key to both env vars so newer and older SDKs work
    api_key = os.getenv("LANGSMITH_API_KEY") or os.getenv("LANGCHAIN_API_KEY")
    if api_key:
        os.environ["LANGCHAIN_API_KEY"] = api_key
        os.environ["LANGSMITH_API_KEY"] = api_key

    os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
    os.environ.setdefault("LANGSMITH_TRACING", "true")
    os.environ.setdefault("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")
    os.environ.setdefault("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com")
    os.environ.setdefault("LANGCHAIN_PROJECT", settings.langsmith_project)
    os.environ.setdefault("LANGSMITH_PROJECT", settings.langsmith_project)


@contextmanager
def trace_run(name: str, *, run_type: str = "chain", metadata: dict[str, Any] | None = None) -> Generator[None, None, None]:
    """Optional LangSmith run wrapper; no-op when tracing disabled."""
    configure_langsmith()
    settings = get_knowledge_settings()
    if not settings.langsmith_enabled:
        yield
        return

    try:
        from langsmith import traceable  # type: ignore

        @traceable(name=name, run_type=run_type, metadata=metadata or {})
        def _inner() -> None:
            return None

        _inner()
        yield
    except Exception:
        yield
