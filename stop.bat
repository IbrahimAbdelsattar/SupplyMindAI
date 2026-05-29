@echo off
title SupplyMind AI - Stop
echo ==============================================
echo   Stopping SupplyMind AI Services
echo ==============================================

echo Stopping Backend Window...
taskkill /F /FI "WINDOWTITLE eq SupplyMind Backend*" /T >nul 2>&1

echo Stopping Frontend Window...
taskkill /F /FI "WINDOWTITLE eq SupplyMind Frontend*" /T >nul 2>&1

echo.
echo Checking for any lingering processes on ports 8080 and 8081...

FOR /F "tokens=5" %%a in ('netstat -aon ^| findstr ":8080" ^| findstr "LISTENING"') do (
    echo Killing process %%a on port 8080...
    taskkill /F /PID %%a /T >nul 2>&1
)

FOR /F "tokens=5" %%a in ('netstat -aon ^| findstr ":8081" ^| findstr "LISTENING"') do (
    echo Killing process %%a on port 8081...
    taskkill /F /PID %%a /T >nul 2>&1
)

echo.
echo ==============================================
echo   All services stopped cleanly.
echo ==============================================
pause
