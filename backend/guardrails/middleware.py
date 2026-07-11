import os
import time
import logging
from fastapi import Request, Response
from fastapi.responses import StreamingResponse
from starlette.middleware.base import BaseHTTPMiddleware
from .config import GuardrailsConfig
from .input_guardrails import InputGuardrails
from .tenant_guardrails import TenantGuardrails
from .rag_guardrails import RAGGuardrails
from .forecast_guardrails import ForecastGuardrails
from .output_guardrails import OutputGuardrails
from .agent_guardrails import AgentGuardrails
# Rate limiter enabled for production only
from .rate_limiter import RateLimiter
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
        self.rate_limiter = RateLimiter(self.config)
        self.monitor = monitor or GuardrailMonitor(self.config)

        self.GUARDRAILED_ENDPOINTS = {
            "/api/v1/rag/query": "rag",
            "/api/v1/copilot/chat": "rag",
            "/api/v1/copilot/chat/stream": "rag",
            "/api/v1/forecast/intelligence": "forecast",
            "/api/v1/forecast/predict": "forecast",
            "/api/v1/agents/executive-insights": "agent",
            "/api/v1/knowledge/query": "rag",
            "/api/v1/knowledge/search": "rag",
            "/api/v1/knowledge/ingest": "rag",
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

        # Enable rate limiter in production only to avoid dev retry storms
        if os.getenv("ENVIRONMENT", "development") == "production":
            client_ip = request.client.host if request.client else "unknown"
            rate_result = self.rate_limiter.check(user_id=user_id, tenant_id=tenant_id, ip=client_ip, endpoint=request.url.path)
            if not rate_result.passed:
                return Response(
                    content=f'{{"error":"blocked","message":"Too many requests","detail":"{rate_result.violations[0].details}"}}',
                    status_code=429,
                    media_type="application/json",
                )

        if request.method in ("POST", "PUT", "PATCH"):
            path = request.url.path
            if path in self.GUARDRAILED_ENDPOINTS:
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

        is_dev = os.getenv("ENVIRONMENT", "development") == "development"

        try:
            response = await call_next(request)

            # Only run output guardrails for endpoints that are explicitly
            # guardrailed (POST/PUT/PATCH to AI-facing routes).  GET data
            # endpoints (e.g. /api/v1/data/*) must not be intercepted —
            # consuming the body iterator and reconstructing a Response
            # drops the Content-Type header, causing 500s on the frontend.
            if (
                response.status_code < 400
                and request.url.path in self.GUARDRAILED_ENDPOINTS
                and not isinstance(response, StreamingResponse)
            ):
                response_body = b""
                async for chunk in response.body_iterator:
                    response_body += chunk

                decoded_body = response_body.decode("utf-8", errors="ignore")
                output_result = self.output_guardrails.check_output(
                    decoded_body,
                    user_id=user_id,
                    tenant_id=tenant_id,
                )
                for v in output_result.violations:
                    self.monitor.record_violation(v)

                if output_result.violations:
                    # DEBUG: log the full response body when any violation is detected
                    logger.warning(
                        "OUTPUT_GUARDRAIL_VIOLATION | endpoint=%s | violations=%d | body_preview=%s",
                        request.url.path,
                        len(output_result.violations),
                        decoded_body[:500],
                    )
                    for v in output_result.violations:
                        logger.warning(
                            "  VIOLATION: category=%s severity=%s details=%s",
                            v.category.value, v.severity.value, v.details,
                        )

                if output_result.blocked and not is_dev:
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
