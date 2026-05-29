"""Supabase client for the intelligence layer (service role, server-side only)."""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Any

from backend.knowledge.config import get_knowledge_settings

LOGGER = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_supabase_client() -> Any | None:
    settings = get_knowledge_settings()
    if not settings.is_configured:
        LOGGER.warning("Supabase not configured — intelligence layer disabled")
        return None

    try:
        from supabase import create_client

        return create_client(settings.supabase_url, settings.supabase_service_role_key)
    except Exception as exc:
        LOGGER.exception("Failed to create Supabase client: %s", exc)
        return None


def is_supabase_available() -> bool:
    return get_supabase_client() is not None
