@echo off
title SupplyMind AI - Clean Project
echo ==============================================
echo   Cleaning SupplyMind AI Project
echo ==============================================

echo.
echo 1. Removing redundant nested SupplyMindAI folder...
if exist "SupplyMindAI" (
    echo   Removing: SupplyMindAI\ (duplicate workspace - all files merged to root)
    rmdir /S /Q "SupplyMindAI"
    echo   Done.
) else (
    echo   Already clean - no nested folder found.
)

echo.
echo 2. Removing Python cache files (__pycache__)...
for /d /r . %%d in (__pycache__) do @if exist "%%d" (
    echo   Removing: %%d
    rd /s /q "%%d" >nul 2>&1
)

echo.
echo 3. Removing Python package/build caches...
for /d /r . %%d in (.pytest_cache .mypy_cache .ipynb_checkpoints) do @if exist "%%d" (
    echo   Removing: %%d
    rd /s /q "%%d" >nul 2>&1
)

echo.
echo 4. Removing frontend build artifacts (dist)...
if exist "dist" (
    echo   Removing: dist\
    rd /s /q "dist" >nul 2>&1
)

echo.
echo 5. Removing editor/AI tool temp caches (.qodo, .sixth)...
if exist ".qodo" (
    echo   Removing: .qodo\
    rd /s /q ".qodo" >nul 2>&1
)
if exist ".sixth" (
    echo   Removing: .sixth\
    rd /s /q ".sixth" >nul 2>&1
)

echo.
echo 6. Removing legacy AgentRouter and Sub-project files...
if exist "backend\integrations\agentrouter.py" (
    echo   Removing: backend\integrations\agentrouter.py
    del /f /q "backend\integrations\agentrouter.py"
)
if exist "proxy.js" (
    echo   Removing: proxy.js
    del /f /q "proxy.js"
)
if exist "rag-powered-inventory-management" (
    echo   Removing: rag-powered-inventory-management\
    rmdir /S /Q "rag-powered-inventory-management"
)

echo.
echo 7. Removing legacy root-level production Dockerfile...
if exist "frontend.Dockerfile.prod" (
    echo   Removing: frontend.Dockerfile.prod
    del /f /q "frontend.Dockerfile.prod"
)

echo.
echo ==============================================
echo   Project cleaned successfully!
echo ==============================================
pause
