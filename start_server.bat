@echo off
title Quality Monitoring System - Local Server
cd /d "%~dp0"
echo ==============================================================
echo  Quality Monitoring System Dashboard - Independent Local Server
echo ==============================================================
echo.
echo Dashboard URL: http://localhost:8080
echo.
echo Opening browser...
start http://localhost:8080
echo Server is running. Press Ctrl+C or close this window to stop.
echo.
python -m http.server 8080
pause
