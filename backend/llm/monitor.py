from __future__ import annotations

import json
import logging
import time
from collections import defaultdict
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock
from typing import Any

LOGGER = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# LLM call record
# ---------------------------------------------------------------------------
@dataclass
class LLMCallRecord:
    timestamp: str
    feature: str
    model: str
    provider: str
    latency_ms: float
    input_tokens: int
    output_tokens: int
    total_tokens: int
    success: bool
    error: str | None = None
    context_length: int = 0
    response_length: int = 0
    cost_estimate_usd: float | None = None


# ---------------------------------------------------------------------------
# Pricing table (USD per 1M tokens) — update as providers change pricing
# ---------------------------------------------------------------------------
_PRICING: dict[str, dict[str, float]] = {
    "nvidia/nemotron-3-super-120b-a12b:free": {"input": 0.0, "output": 0.0},
    "openai/gpt-4o": {"input": 2.50, "output": 10.00},
    "openai/gpt-4o-mini": {"input": 0.15, "output": 0.60},
    "anthropic/claude-3.5-sonnet": {"input": 3.00, "output": 15.00},
}


def _estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float | None:
    """Estimate cost in USD. Returns None if pricing unknown."""
    pricing = _PRICING.get(model)
    if pricing is None:
        return None
    return (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000


# ---------------------------------------------------------------------------
# LLM Monitor (thread-safe, in-memory)
# ---------------------------------------------------------------------------
class LLMMonitor:
    """Lightweight in-memory LLM call monitor with stats, history, and structured logging."""

    def __init__(self, max_history: int = 5000):
        self._records: list[LLMCallRecord] = []
        self._stats: dict[str, dict[str, Any]] = defaultdict(lambda: {
            "calls": 0,
            "successes": 0,
            "failures": 0,
            "total_latency_ms": 0.0,
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "total_cost_usd": 0.0,
            "latencies": [],
        })
        self._max_history = max_history
        self._lock = Lock()

    def record_call(
        self,
        feature: str,
        model: str,
        provider: str,
        latency_ms: float,
        input_tokens: int = 0,
        output_tokens: int = 0,
        success: bool = True,
        error: str | None = None,
        context_length: int = 0,
        response_length: int = 0,
    ) -> LLMCallRecord:
        total_tokens = input_tokens + output_tokens
        cost = _estimate_cost(model, input_tokens, output_tokens)

        record = LLMCallRecord(
            timestamp=datetime.now(timezone.utc).isoformat(),
            feature=feature,
            model=model,
            provider=provider,
            latency_ms=round(latency_ms, 2),
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            success=success,
            error=error,
            context_length=context_length,
            response_length=response_length,
            cost_estimate_usd=round(cost, 6) if cost is not None else None,
        )

        with self._lock:
            self._records.append(record)
            if len(self._records) > self._max_history:
                self._records = self._records[-self._max_history // 2:]

            s = self._stats[feature]
            s["calls"] += 1
            if success:
                s["successes"] += 1
            else:
                s["failures"] += 1
            s["total_latency_ms"] += latency_ms
            s["total_input_tokens"] += input_tokens
            s["total_output_tokens"] += output_tokens
            if cost is not None:
                s["total_cost_usd"] += cost
            s["latencies"].append(latency_ms)
            if len(s["latencies"]) > 1000:
                s["latencies"] = s["latencies"][-500:]

        # Structured log line (parseable by log aggregators)
        log_data = {
            "event": "llm_call",
            "feature": feature,
            "model": model,
            "provider": provider,
            "latency_ms": round(latency_ms, 2),
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": total_tokens,
            "success": success,
            "context_length": context_length,
            "response_length": response_length,
        }
        if cost is not None:
            log_data["cost_usd"] = round(cost, 6)
        if error:
            log_data["error"] = error

        if success:
            LOGGER.info("LLM call: %s", json.dumps(log_data))
        else:
            LOGGER.warning("LLM call failed: %s", json.dumps(log_data))

        return record

    def get_stats(self) -> dict[str, Any]:
        """Return aggregated stats per feature."""
        with self._lock:
            result = {}
            for feature, s in self._stats.items():
                latencies = s["latencies"]
                result[feature] = {
                    "calls": s["calls"],
                    "successes": s["successes"],
                    "failures": s["failures"],
                    "success_rate": round(s["successes"] / s["calls"] * 100, 1) if s["calls"] else 0,
                    "avg_latency_ms": round(s["total_latency_ms"] / s["calls"], 2) if s["calls"] else 0,
                    "p50_latency_ms": round(sorted(latencies)[len(latencies) // 2], 2) if latencies else 0,
                    "p95_latency_ms": round(sorted(latencies)[int(len(latencies) * 0.95)], 2) if latencies else 0,
                    "max_latency_ms": round(max(latencies), 2) if latencies else 0,
                    "total_input_tokens": s["total_input_tokens"],
                    "total_output_tokens": s["total_output_tokens"],
                    "total_cost_usd": round(s["total_cost_usd"], 6),
                }
            return result

    def get_recent(self, limit: int = 50, feature: str | None = None) -> list[dict]:
        """Return recent call records as dicts."""
        with self._lock:
            records = self._records
            if feature:
                records = [r for r in records if r.feature == feature]
            return [
                {
                    "timestamp": r.timestamp,
                    "feature": r.feature,
                    "model": r.model,
                    "provider": r.provider,
                    "latency_ms": r.latency_ms,
                    "input_tokens": r.input_tokens,
                    "output_tokens": r.output_tokens,
                    "success": r.success,
                    "error": r.error,
                    "cost_usd": r.cost_estimate_usd,
                }
                for r in records[-limit:]
            ]


# ---------------------------------------------------------------------------
# Global singleton
# ---------------------------------------------------------------------------
llm_monitor = LLMMonitor()


# ---------------------------------------------------------------------------
# Context manager for easy instrumentation
# ---------------------------------------------------------------------------
@contextmanager
def monitor_llm_call(feature: str, model: str = "unknown", provider: str = "unknown"):
    """Context manager that records LLM call metrics on exit.

    Usage:
        with monitor_llm_call("ai_insights", "nvidia/nemotron-3-super-120b-a12b:free", "openrouter"):
            response = llm.invoke(messages)
            # Optional: pass token counts after the call
            monitor_llm_call.record_tokens(response)
    """
    start = time.monotonic()
    ctx = {"success": True, "error": None, "input_tokens": 0, "output_tokens": 0, "context_length": 0, "response_length": 0}

    def record_tokens(response, input_len: int = 0, output_len: int = 0):
        """Extract token counts from a LangChain response object."""
        if hasattr(response, "usage_metadata"):
            usage = response.usage_metadata or {}
            ctx["input_tokens"] = usage.get("input_tokens", 0)
            ctx["output_tokens"] = usage.get("output_tokens", 0)
        ctx["context_length"] = input_len
        ctx["response_length"] = output_len

    ctx["record_tokens"] = record_tokens

    try:
        yield ctx
    except Exception as exc:
        ctx["success"] = False
        ctx["error"] = str(exc)[:200]
        raise
    finally:
        elapsed_ms = (time.monotonic() - start) * 1000
        llm_monitor.record_call(
            feature=feature,
            model=model,
            provider=provider,
            latency_ms=elapsed_ms,
            input_tokens=ctx["input_tokens"],
            output_tokens=ctx["output_tokens"],
            success=ctx["success"],
            error=ctx["error"],
            context_length=ctx["context_length"],
            response_length=ctx["response_length"],
        )
