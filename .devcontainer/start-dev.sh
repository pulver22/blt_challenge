#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_DIR="$ROOT_DIR/var/devcontainer"
mkdir -p "$RUNTIME_DIR" "$ROOT_DIR/var/data" "$ROOT_DIR/groundtruth"

restart_if_requested() {
  local name="$1"
  local pattern="$2"

  if [[ "${RESTART_SERVERS:-0}" != "1" ]]; then
    return
  fi

  if pgrep -f "$pattern" >/dev/null 2>&1; then
    echo "Stopping $name"
    pkill -f "$pattern" || true
  fi
}

start_if_needed() {
  local name="$1"
  local pattern="$2"
  local log_file="$3"
  shift 3

  restart_if_requested "$name" "$pattern"

  if pgrep -f "$pattern" >/dev/null 2>&1; then
    echo "$name already running"
    return
  fi

  echo "Starting $name"
  (
    cd "$ROOT_DIR"
    nohup "$@" >"$log_file" 2>&1 &
  )
}

if [[ "${1:-}" == "restart" ]]; then
  RESTART_SERVERS=1
fi

start_if_needed \
  "Vite frontend" \
  "vite.*--host 0.0.0.0.*--port 5173" \
  "$RUNTIME_DIR/frontend.log" \
  npm run dev -- --host 0.0.0.0 --port 5173

start_if_needed \
  "FastAPI backend" \
  "uvicorn backend.main:app.*--port 8017" \
  "$RUNTIME_DIR/backend.log" \
  python -m uvicorn backend.main:app --host 0.0.0.0 --port 8017 --reload

echo "Dev servers requested. Logs:"
echo "  Frontend: $RUNTIME_DIR/frontend.log"
echo "  Backend:  $RUNTIME_DIR/backend.log"
