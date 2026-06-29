from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any

from celery import Celery
from celery.schedules import crontab
from celery.signals import celeryd_init, setup_logging

LOGGER = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


class CeleryConfig:
    broker_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    result_backend: str = broker_url
    task_serializer: str = "json"
    accept_content: list[str] = ["json"]
    result_serializer: str = "json"
    timezone: str = "UTC"
    enable_utc: bool = True
    task_track_started: bool = True
    task_time_limit: int = 3600
    task_soft_time_limit: int = 3000
    worker_hijack_root_logger: bool = False
    worker_log_color: bool = True
    worker_max_tasks_per_child: int = 100
    worker_max_memory_per_child: int = 800000

    task_routes: dict[str, dict[str, str]] = {
        "worker.tasks.ml_tasks.*": {"queue": "ml"},
        "worker.tasks.rag_tasks.*": {"queue": "rag"},
    }

    task_queues: dict[str, dict[str, str]] = {
        "default": {"exchange": "default", "routing_key": "default"},
        "ml": {"exchange": "ml", "routing_key": "ml"},
        "rag": {"exchange": "rag", "routing_key": "rag"},
    }

    task_default_queue: str = "default"
    task_default_exchange: str = "default"
    task_default_routing_key: str = "default"

    beat_schedule: dict[str, dict[str, Any]] = {
        "daily-report-digest": {
            "task": "worker.tasks.report_tasks.generate_scheduled_reports",
            "schedule": crontab(hour=2, minute=0),
            "options": {"queue": "default"},
        },
        "hourly-alert-check": {
            "task": "worker.tasks.notification_tasks.evaluate_alert_conditions",
            "schedule": crontab(minute=0),
            "args": ("system",),
            "options": {"queue": "default"},
        },
        "nightly-rag-reindex": {
            "task": "worker.tasks.rag_tasks.warm_up_rag",
            "schedule": crontab(hour=3, minute=30),
            "options": {"queue": "rag"},
        },
    }


celery_app = Celery("supplymind", include=["worker.tasks"])
celery_app.config_from_object(CeleryConfig())


@setup_logging.connect
def on_setup_logging(**kwargs: Any) -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )


@celeryd_init.connect
def on_worker_init(**kwargs: Any) -> None:
    from backend.db import create_tables

    create_tables()
    LOGGER.info("Worker initialized — DB tables ensured")
