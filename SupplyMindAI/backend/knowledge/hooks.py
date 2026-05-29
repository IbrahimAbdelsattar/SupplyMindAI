"""Async ingestion hooks — operational pipelines unchanged; knowledge indexed in background."""

from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable

from backend.knowledge.config import get_knowledge_settings
from backend.knowledge.ingestion import (
    ingest_forecast_summary,
    ingest_insight,
    ingest_inventory_recommendation,
    ingest_mlops_event,
    ingest_report,
)

LOGGER = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="knowledge-ingest")


def _run_async(fn: Callable[..., Any], *args: Any, **kwargs: Any) -> None:
    settings = get_knowledge_settings()
    if not settings.is_configured:
        return

    def _task() -> None:
        try:
            fn(*args, **kwargs)
        except Exception as exc:
            LOGGER.warning("Background ingestion failed: %s", exc)

    if settings.ingestion_async:
        _executor.submit(_task)
    else:
        _task()


def on_forecast_generated(
    *,
    product_id: str,
    horizon_days: int,
    series_summary: str,
    user_id: str | None = None,
) -> None:
    _run_async(
        ingest_forecast_summary,
        product_id=product_id,
        horizon_days=horizon_days,
        summary=series_summary,
        user_id=user_id,
    )


def on_inventory_recommendations(
    *,
    recommendations_text: str,
    user_id: str | None = None,
) -> None:
    _run_async(
        ingest_inventory_recommendation,
        product_id="batch",
        summary=recommendations_text,
        user_id=user_id,
        extra={"scope": "inventory_optimize_batch"},
    )


def on_insight_generated(
    *,
    product_id: str,
    insight_text: str,
    user_id: str | None = None,
) -> None:
    _run_async(
        ingest_insight,
        product_id=product_id,
        summary=insight_text,
        user_id=user_id,
    )


def on_report_generated(
    *,
    report_id: str,
    title: str,
    content: str,
    user_id: str | None = None,
) -> None:
    _run_async(
        ingest_report,
        report_id=report_id,
        title=title,
        content=content,
        user_id=user_id,
    )


def on_mlops_snapshot(
    *,
    metrics_summary: str,
    user_id: str | None = None,
) -> None:
    _run_async(
        ingest_mlops_event,
        event_id="metrics_snapshot",
        summary=metrics_summary,
        user_id=user_id,
    )
