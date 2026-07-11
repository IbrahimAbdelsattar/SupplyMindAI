#!/bin/bash
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env"
PROJECT="supplymind"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Deploy SupplyMind AI production stack.

Options:
  -b, --build      Build images locally (default: pull pre-built images)
  -e, --env FILE   Environment file (default: .env)
  -h, --help       Show this help message
EOF
  exit 0
}

BUILD=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--build) BUILD=true; shift ;;
    -e|--env)   ENV_FILE="$2"; shift 2 ;;
    -h|--help)  usage ;;
    *)          echo "Unknown option: $1"; usage ;;
  esac
done

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Copy .env-example to $ENV_FILE and fill in values."
  exit 1
fi

echo "═══ SupplyMind AI — Production Deployment ═══"
echo "  Compose file : $COMPOSE_FILE"
echo "  Env file     : $ENV_FILE"
echo "  Build mode   : $([ "$BUILD" = true ] && echo 'local' || echo 'pull')"

# ── Pull latest images ────────────────────────────────────────────────────
if [ "$BUILD" = false ]; then
  echo ""
  echo ">>> Checking if required images exist locally..."
  
  MISSING_IMAGES="false"
  for img in $(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config --images 2>/dev/null); do
    if ! docker image inspect "$img" >/dev/null 2>&1; then
      MISSING_IMAGES="true"
      break
    fi
  done

  if [ "$MISSING_IMAGES" = "true" ]; then
    echo ">>> Missing images detected. Pulling images..."
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull
  else
    echo ">>> All required images already exist locally. Skipping pull."
  fi
fi

# ── Build images ──────────────────────────────────────────────────────────
if [ "$BUILD" = true ]; then
  echo ""
  echo ">>> Building images (using local cache if available)..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build
fi

# ── Start core services (DB + Redis) first ────────────────────────────────
echo ""
echo ">>> Starting core services (postgres, redis)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --no-deps --wait postgres redis
echo "  Core services ready."

# ── Run database migrations ──────────────────────────────────────────────
echo ""
echo ">>> Running database migrations..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm --no-deps backend \
  python -m alembic upgrade head 2>/dev/null || \
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm --no-deps backend \
    python -c "from backend.main import _run_migrations; _run_migrations()" || \
    echo "  WARNING: Migration step failed — app will attempt auto-migrate on startup."
echo "  Migrations done."

# ── Start full stack ─────────────────────────────────────────────────────
echo ""
echo ">>> Starting all services..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
echo "  All services started."

# ── Wait for health checks ───────────────────────────────────────────────
echo ""
echo ">>> Waiting for services to become healthy..."
WAIT_TIMEOUT=90
ELAPSED=0
while [ $ELAPSED -lt $WAIT_TIMEOUT ]; do
  HEALTHY=$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps --format json 2>/dev/null | python -c "
import sys, json
services = [json.loads(s) for s in sys.stdin.read().splitlines() if s.strip()]
healthy = sum(1 for s in services if s.get('Health', '') == 'healthy')
total = len(services)
# exclude nginx from check — it doesn't have a healthcheck
active = [s for s in services if s.get('Service') != 'nginx']
healthy_active = sum(1 for s in active if s.get('Health', '') in ('healthy', '') or s.get('State') == 'running')
print(f'{healthy_active}/{len(active)}')
" 2>/dev/null || echo "checking")
  echo "    Health: $HEALTHY"
  case "$HEALTHY" in
    */0) sleep 5; ELAPSED=$((ELAPSED+5)) ;;
    *)   break ;;
  esac
done

# ── Cleanup ───────────────────────────────────────────────────────────────
echo ""
echo ">>> Cleaning up old images..."
docker image prune -f --filter "until=24h" 2>/dev/null || true

echo ""
echo "═══ Deployment complete ═══"
echo ""
docker compose -f "$COMPOSE_FILE" ps
