@echo off
echo ===================================
echo  Social Media Agent - Startup
echo ===================================

cd /d "%~dp0"

echo [1/2] Starting Agent...
start "SocialMediaAgent" /B ".\venv\Scripts\python.exe" main.py
timeout /t 3 /nobreak >nul

echo [2/2] Checking health...
curl -s http://localhost:8000/health
echo.

echo ===================================
echo  Agent running at http://localhost:8000
echo  Press Ctrl+C to stop
echo ===================================

:loop
timeout /t 60 /nobreak >nul
goto loop
