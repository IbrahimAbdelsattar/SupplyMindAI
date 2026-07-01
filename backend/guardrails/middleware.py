import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from .config import GuardrailsConfig
from .input_guardrails import InputGuardrails
from .tenant_guardrails import TenantGuardrails
from .rag_guardrails import RAGGuardrails
from .forecast_guardrails import ForecastGuardrails
from .output_guardrails import OutputGuardrails
from .agent_guardrails import AgentGuardrails
# Rate limiter removed — was causing 429 errors during development retry storms.
# from .rate_limiter import RateLimiter
from .monitor import GuardrailMonitor

logger = logging.getLogger(__name__)


class GuardrailsMiddleware(BaseHTTPMiddleware):
    def __init__(
        self,
        app,
        config: GuardrailsConfig | None = None,
        monitor: GuardrailMonitor | None = None,
    ):
        super().__init__(app)
        self.config = config or GuardrailsConfig()
        self.input_guardrails = InputGuardrails(self.config)
        self.tenant_guardrails = TenantGuardrails(self.config)
        self.rag_guardrails = RAGGuardrails(self.config)
        self.forecast_guardrails = ForecastGuardrails(self.config)
        self.output_guardrails = OutputGuardrails(self.config)
        self.agent_guardrails = AgentGuardrails(self.config)
        self.monitor = monitor or GuardrailMonitor(self.config)

        self.GUARDRAILED_ENDPOINTS = {
            "/api/rag/query": "rag",
            "/api/copilot/chat": "rag",
            "/api/forecast/intelligence": "forecast",
            "/api/agents/executive-insights": "agent",
            "/api/knowledge/query": "rag",
            "/api/knowledge/search": "rag",
            "/api/knowledge/ingest": "rag",
        }

    async def dispatch(self, request: Request, call_next):
        # Never block browser preflight requests with auth/input/output guardrails.
        # This prevents OPTIONS from failing (e.g., 400) and breaking login.
        if request.method == "OPTIONS":
            return await call_next(request)

        start = time.monotonic()
        self.monitor.record_request(request.url.path)

        user_id = request.headers.get("X-User-ID")
        tenant_id = request.headers.get("X-Tenant-ID")
        session_id = request.headers.get("X-Session-ID")

        # Rate limiter removed — was causing 429 errors during development retry storms.
        # See backend/guardrails/rate_limiter.py if you want to re-enable.

        if request.method in ("POST", "PUT", "PATCH"):
            body = await request.body()
            text = body.decode("utf-8", errors="ignore")

            input_result = self.input_guardrails.check(
                text, user_id=user_id, tenant_id=tenant_id, session_id=session_id
            )
            for v in input_result.violations:
                self.monitor.record_violation(v)

            if input_result.blocked:
                return Response(
                    content=f'{{"error":"blocked","message":"Input guardrail triggered: {v.category.value}","detail":"{v.details}"}}',
                    status_code=400,
                    media_type="application/json",
                )

        try:
            response = await call_next(request)

            if response.status_code < 400:
                response_body = b""
                async for chunk in response.body_iterator:
                    response_body += chunk

                output_result = self.output_guardrails.check_output(
                    response_body.decode("utf-8", errors="ignore"),
                    user_id=user_id,
                    tenant_id=tenant_id,
                )
                for v in output_result.violations:
                    self.monitor.record_violation(v)

                if output_result.blocked:
                    return Response(
                        content='{"error":"blocked","message":"Output guardrail triggered"}',
                        status_code=400,
                        media_type="application/json",
                    )

                return Response(
                    content=response_body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type,
                )

            return response

        except Exception as e:
            logger.error(f"Guardrails middleware error: {e}")
            duration = (time.monotonic() - start) * 1000
            self.monitor.record_latency("guardrails_middleware", duration)
            raise

        finally:
            duration = (time.monotonic() - start) * 1000
            self.monitor.record_latency("guardrails_middleware", duration)
