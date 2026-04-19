@echo off
setlocal

cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is required. Install Node.js 20 LTS or newer first.
  exit /b 1
)

where cargo >nul 2>nul
if errorlevel 1 (
  echo cargo is required. Install the Rust stable toolchain first.
  exit /b 1
)

if not exist node_modules (
  call npm ci
  if errorlevel 1 exit /b %errorlevel%
)

call npm run tauri -- build %*
exit /b %errorlevel%
