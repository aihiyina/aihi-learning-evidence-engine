@echo off
cd /d "%~dp0"
python -m pip install -r requirements.txt
if errorlevel 1 (
  echo [WHYWHY] Python and dependencies must be installed.
  pause
  exit /b 1
)
start "" http://127.0.0.1:8765
python -m uvicorn whywhy.app:app --host 127.0.0.1 --port 8765
pause
