from __future__ import annotations

import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from backend.knowledge.langsmith_tracing import configure_langsmith

LOGGER = logging.getLogger(__name__)

AGENT_LABELS: dict[str, str] = {
    "supervisor_agent": "Supervisor Orchestrator",
    "forecasting_agent": "Forecasting Agent",
    "inventory_agent": "Inventory Agent",
    "rag_agent": "RAG / Insights Agent",
    "mlops_agent": "MLOps Agent",
    "insights_agent": "Executive Insights Agent",
    "copilot_chat": "Copilot Chat",
    "rag_query": "RAG Query",
    "inventory_rag_query": "Inventory RAG Query",
    "forecast_reasoning": "Forecast Reasoning",
    "insights_analyze": "Insights Analyze",
}

LLM_MODEL_MAP: dict[str, str] = {
    "supervisor_agent": "LLM_REASONING_MODEL",
    "forecasting_agent": "LLM_REASONING_MODEL",
    "inventory_agent": "LLM_REASONING_MODEL",
    "rag_agent": "LLM_REASONING_MODEL",
    "mlops_agent": "LLM_REASONING_MODEL",
    "insights_agent": "LLM_REASONING_MODEL",
    "copilot_chat": "COPILOT_MODEL",
    "rag_query": "RAG_MODEL",
    "inventory_rag_query": "RAG_MODEL",
    "forecast_reasoning": "FORECAST_MODEL",
    "insights_analyze": "COPILOT_MODEL",
}

_RUN_TYPES_IN_SCOPE = {"chain", "llm", "tool"}


def get_langsmith_client():
    from langsmith import Client
    api_key = os.getenv("LANGCHAIN_API_KEY")
    endpoint = os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")
    if not api_key:
        return None
    return Client(api_url=endpoint, api_key=api_key)


def fetch_tracing_data(  # noqa: C901
    hours: int = 24,
) -> dict[str, Any]:
    configure_langsmith()

    enabled = os.getenv("LANGCHAIN_TRACING_V2", "").lower() in {"1", "true", "yes"}
    api_key = os.getenv("LANGCHAIN_API_KEY", "")
    project = os.getenv("LANGCHAIN_PROJECT", "supplymind-ai")

    result: dict[str, Any] = {
        "enabled": enabled,
        "project": project,
        "api_key_configured": bool(api_key),
        "agents": [],
        "total_calls": 0,
        "errors_last_24h": 0,
    }

    if not enabled or not api_key:
        result["agents"] = _agent_list_without_data()
        return result

    try:
        client = get_langsmith_client()
        if client is None:
            result["agents"] = _agent_list_without_data()
            return result

        since = datetime.now(timezone.utc) - timedelta(hours=hours)

        runs = list(
            client.list_runs(
                project_name=project,
                start_time=since,
                run_type="chain",
                limit=100,
            )
        )

        run_counts: dict[str, int] = {}
        run_errors: dict[str, int] = {}
        run_latencies: dict[str, list[float]] = {}
        run_first_seen: dict[str, datetime | None] = {}
        run_last_seen: dict[str, datetime | None] = {}

        for run in runs:
            name = run.name or "unknown"
            if name not in AGENT_LABELS:
                continue

            run_counts[name] = run_counts.get(name, 0) + 1

            if run.error:
                run_errors[name] = run_errors.get(name, 0) + 1

            if run.latency_ms is not None:
                run_latencies.setdefault(name, []).append(run.latency_ms / 1000.0)

            if run.start_time:
                dt = run.start_time
                prev_first = run_first_seen.get(name)
                if prev_first is None or dt < prev_first:
                    run_first_seen[name] = dt
                prev_last = run_last_seen.get(name)
                if prev_last is None or dt > prev_last:
                    run_last_seen[name] = dt

        result["total_calls"] = sum(run_counts.values())
        result["errors_last_24h"] = sum(run_errors.values())

        for agent_key, label in AGENT_LABELS.items():
            count = run_counts.get(agent_key, 0)
            errors = run_errors.get(agent_key, 0)
            latencies = run_latencies.get(agent_key, [])
            model_env = LLM_MODEL_MAP.get(agent_key, "COPILOT_MODEL")
            model_name = os.getenv(model_env, "nvidia/nemotron-3-super-120b-a12b:free")

            avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else None
            first_seen = run_first_seen.get(agent_key)
            last_seen = run_last_seen.get(agent_key)

            if count > 0:
                status: str = "healthy" if errors == 0 else "degraded"
            else:
                status = "idle"

            result["agents"].append({
                "name": agent_key,
                "label": label,
                "model": model_name,
                "status": status,
                "calls_last_24h": count,
                "errors_last_24h": errors,
                "avg_latency_seconds": avg_latency,
                "first_seen": first_seen.isoformat() if first_seen else None,
                "last_seen": last_seen.isoformat() if last_seen else None,
            })

        result["agents"].sort(key=lambda a: a.get("calls_last_24h", 0), reverse=True)

    except Exception as exc:
        LOGGER.warning("Failed to fetch LangSmith traces: %s", exc)
        result["agents"] = _agent_list_without_data()
        result["error"] = str(exc)

    return result


def _agent_list_without_data() -> list[dict[str, Any]]:
    agents: list[dict[str, Any]] = []
    for agent_key, label in AGENT_LABELS.items():
        model_env = LLM_MODEL_MAP.get(agent_key, "COPILOT_MODEL")
        model_name = os.getenv(model_env, "nvidia/nemotron-3-super-120b-a12b:free")
        agents.append({
            "name": agent_key,
            "label": label,
            "model": model_name,
            "status": "idle",
            "calls_last_24h": 0,
            "errors_last_24h": 0,
            "avg_latency_seconds": None,
            "first_seen": None,
            "last_seen": None,
        })
    return agents
