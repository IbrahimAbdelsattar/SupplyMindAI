#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "Starting SupplyMind AI Platform..."

if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
fi

if [ ! -f frontend/.env.local ]; then
  echo "VITE_API_URL=http://localhost:8000/api/v1" > frontend/.env.local
fi

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi

# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

if [ ! -d frontend/node_modules ]; then
  cd frontend && npm install && cd "$ROOT"
fi

echo "Starting FastAPI Backend..."
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo "Waiting for backend..."
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8000/api/v1/health >/dev/null; then
    break
  fi
  sleep 2
done

echo "Starting React/Vite Frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo "SupplyMind AI is running."
echo "  Frontend: http://127.0.0.1:5173"
echo "  Backend:  http://127.0.0.1:8000 (or http://127.0.0.1:8081)"
echo "  Demo:     demo@supplymind.ai / demo"

wait $BACKEND_PID
wait $FRONTEND_PID
