@echo off
rem Study Compass pilot launcher: start local server (minimized) and open the app
cd /d "%~dp0"
start "Study Compass server - do not close" /min node serve.js
timeout /t 2 /nobreak >nul
start "" "http://localhost:5178/?pilot=start"
