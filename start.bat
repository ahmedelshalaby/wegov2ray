@echo off
title wegov2ray Full Local Test
cd /d "%~dp0"
set "XDG_CONFIG_HOME=%CD%\.wrangler-config"
set "WRANGLER_SEND_METRICS=false"
set "TEMP=%CD%\.wrangler\tmp"
set "TMP=%CD%\.wrangler\tmp"
echo Building the site and preparing an isolated local D1 database...
call npm run local
if errorlevel 1 (
  echo.
  echo Local startup failed. Review the error above.
  pause
)


