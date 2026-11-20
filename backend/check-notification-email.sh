#!/bin/sh
set -eu
cd "$(dirname "$0")"
exec env DEBUG="${FLENZR_DEBUG:-false}" .venv/bin/python -m app.domains.notifications.smtp "$@"
