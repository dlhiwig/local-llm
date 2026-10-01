@echo off
title Mistral 7B Local Studio
cd /d "%~dp0"

echo ========================================================
echo   Launching Mistral 7B Local Studio
echo ========================================================
echo.

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in your PATH.
    pause
    exit /b 1
)

python server.py
pause
