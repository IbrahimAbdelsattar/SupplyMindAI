import time
import json
import logging
from datetime import datetime
from collections import defaultdict
from threading import Lock
from typing import Optional
from .config import GuardrailsConfig
from .models import GuardrailViolation

logger = logging.getLogger(__name__)


class GuardrailMonitor:
    def __init__(self, config: GuardrailsConfig | None = None):
        self.config = config or GuardrailsConfig()
        self._violations: list[GuardrailViolation] = []
        self._latencies: dict[str, list[float]] = defaultdict(list)
        self._request_counts: dict[str, int] = defaultdict(int)
        self._lock = Lock()

    def record_violation(self, violation: GuardrailViolation):
        with self._lock:
            self._violations.append(violation)

        log_data = {
            "event": "guardrail_violation",
            "timestamp": violation.timestamp.isoformat(),
            "category": violation.category.value,
            "severity": violation.severity.value,
            "user_id": violation.user_id,
            "tenant_id": violation.tenant_id,
            "source": violation.source,
            "blocked": violation.blocked,
        }

        if violation.severity in ("high", "critical"):
            logger.warning(f"Guardrail violation: {json.dumps(log_data)}")
        else:
            logger.info(f"Guardrail event: {json.dumps(log_data)}")

    def record_latency(self, guardrail_name: str, duration_ms: float):
        with self._lock:
            self._latencies[guardrail_name].append(duration_ms)
            if len(self._latencies[guardrail_name]) > 10000:
                self._latencies[guardrail_name] = self._latencies[guardrail_name][-5000:]

    def record_request(self, endpoint: str):
        with self._lock:
            self._request_counts[endpoint] += 1

    def get_stats(self) -> dict:
        with self._lock:
            total_violations = len(self._violations)
            violations_by_category: dict[str, int] = defaultdict(int)
            violations_by_severity: dict[str, int] = defaultdict(int)
            blocked_count = 0

            for v in self._violations:
                violations_by_category[v.category.value] += 1
                violations_by_severity[v.severity.value] += 1
                if v.blocked:
                    blocked_count += 1

            latencies = {}
            for name, times in self._latencies.items():
                if times:
                    latencies[name] = {
                        "avg_ms": round(sum(times) / len(times), 2),
                        "max_ms": round(max(times), 2),
                        "min_ms": round(min(times), 2),
                        "count": len(times),
                    }

            return {
                "total_violations": total_violations,
                "total_blocked": blocked_count,
                "violations_by_category": dict(violations_by_category),
                "violations_by_severity": dict(violations_by_severity),
                "latencies": latencies,
                "endpoint_requests": dict(self._request_counts),
                "uptime_seconds": round(time.monotonic(), 2),
            }

    def get_recent_violations(self, limit: int = 100) -> list[dict]:
        with self._lock:
            recent = self._violations[-limit:]
            return [
                {
                    "id": str(i),
                    "timestamp": v.timestamp.isoformat(),
                    "category": v.category.value,
                    "severity": v.severity.value,
                    "user_id": v.user_id,
                    "tenant_id": v.tenant_id,
                    "source": v.source,
                    "details": v.details,
                    "blocked": v.blocked,
                    "input_preview": v.input_preview[:100] if v.input_preview else None,
                }
                for i, v in enumerate(recent)
            ]

    def clear_violations(self):
        with self._lock:
            self._violations.clear()

    def get_violation_count(self, since: Optional[datetime] = None) -> int:
        with self._lock:
            if since is None:
                return len(self._violations)
            return sum(1 for v in self._violations if v.timestamp >= since)
