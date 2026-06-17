"""Batch embedding generation with in-memory cache."""

from __future__ import annotations

import hashlib
import logging
import os
from functools import lru_cache
from threading import Lock
from typing import Sequence

from backend.knowledge.config import get_knowledge_settings

LOGGER = logging.getLogger(__name__)

# Force single-threaded execution for embedding generation to avoid
# sentence-transformers/transformers/rayon thread-pool initialization panics.
# These must be set before importing SentenceTransformer.
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("VECLIB_MAXIMUM_THREADS", "1")
os.environ.setdefault("NUMEXPR_NUM_THREADS", "1")
os.environ.setdefault("RAYON_NUM_THREADS", "1")

_embed_lock = Lock()
_cache: dict[str, list[float]] = {}


@lru_cache(maxsize=1)
def _get_model():
    # Model loading is serialized by _embed_lock (callers must hold the lock).
    settings = get_knowledge_settings()
    try:
        from sentence_transformers import SentenceTransformer

        return SentenceTransformer(settings.embedding_model)
    except Exception as exc:
        LOGGER.exception("Embedding model load failed: %s", exc)
        raise



def _cache_key(text: str) -> str:
    settings = get_knowledge_settings()
    raw = f"{settings.embedding_model}:{text}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def embed_text(text: str) -> list[float]:
    key = _cache_key(text)
    if key in _cache:
        return _cache[key]

    with _embed_lock:
        if key in _cache:
            return _cache[key]
        model = _get_model()
        vector = model.encode(text, normalize_embeddings=True).tolist()
        _cache[key] = vector
        return vector


def embed_texts_batch(texts: Sequence[str]) -> list[list[float]]:
    if not texts:
        return []

    settings = get_knowledge_settings()
    results: list[list[float] | None] = [None] * len(texts)
    to_compute: list[tuple[int, str]] = []

    for i, text in enumerate(texts):
        key = _cache_key(text)
        if key in _cache:
            results[i] = _cache[key]
        else:
            to_compute.append((i, text))

    if to_compute:
        with _embed_lock:
            model = _get_model()
            batch_size = max(1, settings.batch_embed_size)
            for start in range(0, len(to_compute), batch_size):
                chunk = to_compute[start : start + batch_size]
                indices = [c[0] for c in chunk]
                batch_texts = [c[1] for c in chunk]
                vectors = model.encode(batch_texts, normalize_embeddings=True)
                for idx, text, vec in zip(indices, batch_texts, vectors):
                    v = vec.tolist()
                    _cache[_cache_key(text)] = v
                    results[idx] = v

    return [r if r is not None else embed_text("") for r in results]


def chunk_text(content: str, max_chars: int = 1200) -> list[str]:
    content = content.strip()
    if len(content) <= max_chars:
        return [content] if content else []

    chunks: list[str] = []
    start = 0
    while start < len(content):
        end = min(len(content), start + max_chars)
        if end < len(content):
            break_at = content.rfind("\n", start, end)
            if break_at > start:
                end = break_at
        piece = content[start:end].strip()
        if piece:
            chunks.append(piece)
        start = end
    return chunks
