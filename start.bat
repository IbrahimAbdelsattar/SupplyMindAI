@echo off
REM SupplyMindAI Start Script
REM This script starts the frontend and backend development servers

echo =========================================
echo    SupplyMindAI Development Server
echo =========================================
echo.

REM Get the project root directory
set PROJECT_ROOT=%~dp0

REM Start backend in a new terminal window
echo Starting Backend Server (FastAPI)...
start "SupplyMindAI Backend" cmd /k "cd %PROJECT_ROOT%backend && python main.py"

REM Wait a moment for backend to start
timeout /t 2 /nobreak

REM Start frontend in a new terminal window
echo Starting Frontend Server (Vite)...
start "SupplyMindAI Frontend" cmd /k "cd %PROJECT_ROOT% && npm run dev"

echo.
echo =========================================
echo  Servers starting in separate windows
echo  Frontend: http://localhost:5173
echo  Backend: http://localhost:8000
echo =========================================
pause
