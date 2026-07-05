"""Local knowledge layer configuration."""

from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class KnowledgeSettings:
    embedding_model: str
    embedding_dimension: int
    match_threshold: float
    default_match_count: int
    batch_embed_size: int
    ingestion_async: bool
    langsmith_enabled: bool
    langsmith_project: str

    @property
    def is_configured(self) -> bool:
        return True


@lru_cache(maxsize=1)
def get_knowledge_settings() -> KnowledgeSettings:
    return KnowledgeSettings(
        embedding_model=os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2"),
        embedding_dimension=int(os.getenv("EMBEDDING_DIMENSION", "384")),
        match_threshold=float(os.getenv("KNOWLEDGE_MATCH_THRESHOLD", "0.45")),
        default_match_count=int(os.getenv("KNOWLEDGE_MATCH_COUNT", "8")),
        batch_embed_size=int(os.getenv("KNOWLEDGE_BATCH_EMBED_SIZE", "32")),
        ingestion_async=os.getenv("KNOWLEDGE_INGESTION_ASYNC", "true").strip().lower()
        in {"1", "true", "yes", "on"},
        langsmith_enabled=os.getenv("LANGCHAIN_TRACING_V2", "false").strip().lower()
        in {"1", "true", "yes", "on"}
        or os.getenv("LANGSMITH_TRACING", "false").strip().lower()
        in {"1", "true", "yes", "on"},
        langsmith_project=os.getenv("LANGCHAIN_PROJECT") or os.getenv("LANGSMITH_PROJECT", "supplymind-ai"),
    )
