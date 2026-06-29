@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"
title SupplyMind AI

echo.
echo ==============================================
echo   SupplyMind AI - Full Stack Launcher
echo ==============================================
echo.

REM --- Environment file ---
if not exist ".env" (
  if exist ".env.example" (
    echo Creating .env from .env.example ...
    copy /Y ".env.example" ".env" >nul
  ) else (
    echo WARNING: No .env file found. API keys may be missing.
  )
)

REM --- Frontend API URL for Vite ---
if not exist ".env.local" (
  echo VITE_API_URL=http://localhost:8081/api/v1> ".env.local"
) else (
  findstr /C:"VITE_API_URL" ".env.local" >nul 2>&1
  if errorlevel 1 echo VITE_API_URL=http://localhost:8081/api/v1>> ".env.local"
)

REM --- Data CSV check ---
set "DATA_OK=1"
for %%F in (products.csv sales_daily.csv inventory.csv bom.csv suppliers.csv raw_materials.csv) do (
  if not exist "data\%%F" set "DATA_OK=0"
)
if "!DATA_OK!"=="1" (
  echo Data folder OK - CSV datasets found in .\data\
) else (
  echo.
  echo WARNING: Some CSV files are missing in .\data\
  echo   Expected: products.csv, sales_daily.csv, inventory.csv, bom.csv, suppliers.csv, raw_materials.csv
  echo.
)

REM --- Python virtual environment ---
if not exist ".venv\Scripts\python.exe" (
  echo Creating Python virtual environment...
  python -m venv .venv
  if errorlevel 1 (
    echo ERROR: Could not create venv. Install Python 3.10+ and try again.
    pause
    exit /b 1
  )
  echo Installing Python dependencies...
  call ".venv\Scripts\python.exe" -m pip install -q --upgrade pip
  call ".venv\Scripts\python.exe" -m pip install -q -r requirements.txt
  if errorlevel 1 (
    echo ERROR: pip install failed.
    pause
    exit /b 1
  )
) else (
  echo Python virtual environment found. Skipping pip install.
)

REM --- Node dependencies ---
where npm >nul 2>&1
if errorlevel 1 (
  echo ERROR: npm not found. Install Node.js 18+ and try again.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing frontend dependencies...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
)

REM --- Start backend ---
echo.
echo Starting FastAPI backend on http://127.0.0.1:8081 ...
start "SupplyMind Backend" cmd /k "cd /d "%~dp0" && .venv\Scripts\python.exe -m uvicorn backend.main:app --reload --reload-dir backend --host 0.0.0.0 --port 8081"

REM --- Wait for backend health ---
echo Waiting for backend to become ready...
set /a RETRIES=0
:wait_backend
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8081/api/v1/health' -UseBasicParsing -TimeoutSec 3; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 goto backend_ready
set /a RETRIES+=1
if !RETRIES! GEQ 30 (
  echo WARNING: Backend health check timed out. It may still be starting.
  goto backend_ready
)
timeout /t 2 /nobreak >nul
goto wait_backend

:backend_ready
echo Backend is up.

REM --- Start frontend ---
echo Starting Vite frontend on http://127.0.0.1:8080 ...
start "SupplyMind Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo ==============================================
echo   SupplyMind AI is running
echo ==============================================
echo   Frontend:  http://127.0.0.1:8080
echo   Backend:   http://127.0.0.1:8081
echo   API docs:  http://127.0.0.1:8081/docs
echo   Demo login: "admin@supplymind.ai" / "Admin@123!"
echo.
echo   Optional: set OPENROUTER_API_KEY in .env for AI chat and insights.
echo ==============================================
echo.
pause

endlocal
