@echo off
title Tamil Nadu Van Travels Web Server
echo =======================================================
echo   Starting Tamil Nadu Van Travels Web Application...
echo =======================================================
cd /d "%~dp0"
bin\run-node.cmd server.js
pause
