@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"
title SupplyMind AI - Native Launcher

echo.
echo ==============================================
echo   SupplyMind AI - Native Launcher
echo ==============================================
echo.

REM --- Environment files ---
if not exist ".env" (
  if exist ".env.example" (
    echo Creating .env from .env.example...
    copy /Y ".env.example" ".env" >nul
  ) else (
    echo WARNING: No .env file found. API keys may be missing.
  )
)

if not exist "frontend\.env.local" (
  echo VITE_API_URL=http://localhost:8081/api/v1> frontend\.env.local
)

REM --- Virtual Environment ---
if not exist ".venv\Scripts\activate.bat" (
  echo Creating Python virtual environment...
  python -m venv .venv
)

echo Activating virtual environment and checking dependencies...
call .venv\Scripts\activate.bat
python -m pip install -q --upgrade pip
if exist "requirements.txt" (
  pip install -q -r requirements.txt
) else if exist "backend\requirements.txt" (
  pip install -q -r backend\requirements.txt
)

REM --- Node Modules ---
pushd frontend
if not exist "node_modules" (
  echo Installing Node modules...
  call npm install
)
popd

echo Starting Backend...
start "SupplyMind Backend" cmd /k "cd /d %~dp0 && call .venv\Scripts\activate.bat && uvicorn backend.main:app --reload --host 127.0.0.1 --port 8081"

echo Starting Frontend...
start "SupplyMind Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"

echo.
echo ==============================================
echo   SupplyMind AI is starting up natively!
echo ==============================================
echo   Frontend: http://127.0.0.1:5173
echo   Backend:  http://127.0.0.1:8081
echo   API docs: http://127.0.0.1:8081/docs
echo ==============================================
echo.
pause
