"""LLM response cache — optional in-memory cache with TTL.

Disable via env: LLM_CACHE_ENABLED=false
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import time
from typing import Any

LOGGER = logging.getLogger(__name__)

_DEFAULT_TTL = 3600  # 1 hour


class LLMCache:
    """Thread-safe in-memory cache for LLM responses."""

    def __init__(self, ttl: int = _DEFAULT_TTL, max_size: int = 256) -> None:
        self._store: dict[str, tuple[float, Any]] = {}
        self._lock = threading.Lock()
        self._ttl = ttl
        self._max_size = max_size
        self._hits = 0
        self._misses = 0

    @staticmethod
    def _make_key(feature: str, messages: list[Any], extra: str = "") -> str:
        """Hash feature + serialized messages into a stable cache key."""
        parts = [feature, extra]
        for m in messages:
            if hasattr(m, "content"):
                parts.append(str(m.content))
            else:
                parts.append(str(m))
        raw = json.dumps(parts, sort_keys=True, default=str)
        return hashlib.sha256(raw.encode()).hexdigest()[:32]

    def get(self, key: str) -> Any | None:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                return None
            ts, value = entry
            if time.monotonic() - ts > self._ttl:
                del self._store[key]
                self._misses += 1
                return None
            self._hits += 1
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            if len(self._store) >= self._max_size:
                # Evict oldest
                oldest_key = min(self._store, key=lambda k: self._store[k][0])
                del self._store[oldest_key]
            self._store[key] = (time.monotonic(), value)

    @property
    def stats(self) -> dict:
        with self._lock:
            total = self._hits + self._misses
            return {
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": f"{self._hits / total * 100:.1f}%" if total else "N/A",
                "size": len(self._store),
            }


def is_cache_enabled() -> bool:
    return os.getenv("LLM_CACHE_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"}


_cache: LLMCache | None = None
_cache_lock = threading.Lock()


def get_cache() -> LLMCache:
    global _cache
    if _cache is None:
        with _cache_lock:
            if _cache is None:
                ttl = int(os.getenv("LLM_CACHE_TTL", "3600"))
                _cache = LLMCache(ttl=ttl)
    return _cache


def cached_llm_call(
    feature: str,
    messages: list[Any],
    llm_fn,
    extra_key: str = "",
) -> Any:
    """Call LLM with optional caching. Returns cached response if available."""
    if not is_cache_enabled():
        return llm_fn()

    cache = get_cache()
    key = cache._make_key(feature, messages, extra_key)
    cached = cache.get(key)
    if cached is not None:
        LOGGER.info("LLM cache HIT for feature=%s key=%s", feature, key[:12])
        return cached

    result = llm_fn()
    cache.set(key, result)
    LOGGER.info("LLM cache SET for feature=%s key=%s", feature, key[:12])
    return result
