#!/bin/bash

echo "Starting SupplyMind AI Platform..."

echo "Installing dependencies..."
npm install
pip install -r requirements.txt

echo "Starting FastAPI Backend..."
python -m uvicorn backend.main:app --port 8000 &
BACKEND_PID=$!

echo "Starting React/Vite Frontend..."
npm run dev &
FRONTEND_PID=$!

echo "SupplyMind AI is booting up..."
echo "Backend running on http://127.0.0.1:8000"
echo "Frontend running via Vite"

# Wait for both processes
wait $BACKEND_PID
wait $FRONTEND_PID
