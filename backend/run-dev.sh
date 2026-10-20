#!/bin/sh
set -eu
cd "$(dirname "$0")"
# Avoid an unrelated shell's DEBUG=release overriding Pydantic's boolean setting.
exec env DEBUG="${FLENZR_DEBUG:-false}" .venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8210 --reload
