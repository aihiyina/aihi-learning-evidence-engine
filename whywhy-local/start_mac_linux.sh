#!/bin/sh
set -e
cd "$(dirname "$0")"
python3 -m pip install -r requirements.txt
python3 -m uvicorn whywhy.app:app --host 127.0.0.1 --port 8765
