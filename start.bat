@echo off
echo Starting SupplyMind AI Platform...

echo Installing dependencies...
call npm install
call pip install -r requirements.txt

echo.
echo ==============================================
echo Starting FastAPI Backend
echo ==============================================
start cmd /k "python -m uvicorn backend.main:app --reload --port 8000"

echo.
echo ==============================================
echo Starting React/Vite Frontend
echo ==============================================
start cmd /k "npm run dev"

echo.
echo SupplyMind AI is booting up...
echo Backend will be available at http://127.0.0.1:8000
echo Frontend will be available at http://127.0.0.1:8080 (or port specified by Vite)
pause
