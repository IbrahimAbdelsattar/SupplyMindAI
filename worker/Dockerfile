# ============================================================================
# Worker Dockerfile - Production-Ready (Celery Workers & Beat)
# ============================================================================
# Multi-stage build sharing the same Python base as backend

# ── Stage 1: Builder ─────────────────────────────────────────────────────
FROM python:3.12-slim as builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip setuptools wheel && \
    /opt/venv/bin/pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime ────────────────────────────────────────────────────
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PATH="/opt/venv/bin:$PATH" \
    OTEL_SERVICE_NAME=supplymind-worker \
    OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
    OTEL_TRACES_SAMPLER=parentbased_traceidratio \
    OTEL_TRACES_SAMPLER_ARG=0.1 \
    OTEL_RESOURCE_ATTRIBUTES=service.version=1.0.0,environment=production

RUN groupadd -r app && useradd -r -g app app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /data && chown -R app:app /data

COPY --from=builder /opt/venv /opt/venv

COPY --chown=app:app backend/ ./backend/
COPY --chown=app:app worker/ ./worker/
COPY --chown=app:app ml_platform/ ./ml_platform/
COPY --chown=app:app data/ ./data/
COPY --chown=app:app requirements.txt .

USER app

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD python -c "import celery; print('celery ok')" || exit 1

CMD ["celery", "-A", "worker.celery_app", "worker", "-Q", "default", "--loglevel=info", "--concurrency=4"]
