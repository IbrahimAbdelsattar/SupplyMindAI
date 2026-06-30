@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"
title SupplyMind AI - Docker Launcher

echo.
echo ==============================================
echo   SupplyMind AI - Docker Launcher
echo ==============================================
echo.

REM --- Check if Docker is running ---
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running or not accessible.
    echo Please ensure that Docker Desktop is opened and running, then try again.
    echo.
    pause
    exit /b 1
)

REM --- Environment file ---
if not exist ".env" (
  if exist ".env.example" (
    echo Creating .env from .env.example ...
    copy /Y ".env.example" ".env" >nul
  ) else (
    echo WARNING: No .env file found. API keys may be missing.
  )
)

echo Starting Docker Compose...
docker-compose up --build -d

if errorlevel 1 (
    echo.
    echo ERROR: Docker Compose failed to start the project.
    echo.
    pause
    exit /b 1
)

echo.
echo ==============================================
echo   SupplyMind AI is running in Docker
echo ==============================================
echo   Frontend:  http://127.0.0.1:8080
echo   Backend:   http://127.0.0.1:8000
echo   API docs:  http://127.0.0.1:8000/docs
echo ==============================================
echo.
pause
