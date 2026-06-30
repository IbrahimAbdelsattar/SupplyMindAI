@echo off
title SupplyMind AI - Stop Docker
echo ==============================================
echo   Stopping SupplyMind AI Docker Containers
echo ==============================================

cd /d "%~dp0"
docker-compose down

echo.
echo ==============================================
echo   All Docker containers stopped cleanly.
echo ==============================================
pause
