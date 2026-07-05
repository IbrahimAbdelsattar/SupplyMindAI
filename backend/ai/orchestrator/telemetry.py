import logging
import json
from typing import Any, Dict

LOGGER = logging.getLogger(__name__)

class TelemetryLogger:
    """Logs and tracks model usage, routing decisions, latencies, and execution health."""

    def log_routing(
        self,
        agent_selected: str,
        routing_confidence: float,
        latency_ms: float,
        success: bool,
        error: str | None = None
    ) -> None:
        """Log intent routing telemetry data in structured format."""
        log_payload = {
            "event": "orchestrator_routing",
            "agent_selected": agent_selected,
            "confidence": round(routing_confidence, 3),
            "latency_ms": round(latency_ms, 2),
            "success": success
        }
        if error:
            log_payload["error"] = error

        if success:
            LOGGER.info("AI Orchestrator telemetry: %s", json.dumps(log_payload))
        else:
            LOGGER.warning("AI Orchestrator telemetry (failure): %s", json.dumps(log_payload))

telemetry_logger = TelemetryLogger()
