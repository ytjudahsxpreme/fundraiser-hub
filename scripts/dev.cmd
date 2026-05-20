@echo off
cd /d %~dp0..
set PATH=C:\Program Files\nodejs;%PATH%
if "%PORT%"=="" set PORT=3001
node node_modules\next\dist\bin\next dev --port %PORT%
