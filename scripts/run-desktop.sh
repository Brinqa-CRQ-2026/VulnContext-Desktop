#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PID=""
RENDERER_PID=""
ELECTRON_PID=""
EXIT_CODE=0
IS_CLEANING_UP=0
DEFAULT_BACKEND_PORT="${BACKEND_PORT:-8000}"
DEFAULT_RENDERER_PORT="${RENDERER_PORT:-5173}"

start_process() {
  local workdir="$1"
  shift

  (
    cd "$workdir"
    exec "$@" </dev/null >&2
  ) &

  echo $!
}

process_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

terminate_process() {
  local pid="$1"
  if process_running "$pid"; then
    kill "$pid" 2>/dev/null || true
  fi
}

force_kill_process() {
  local pid="$1"
  if process_running "$pid"; then
    kill -9 "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  if [[ "$IS_CLEANING_UP" -eq 1 ]]; then
    return
  fi

  IS_CLEANING_UP=1

  terminate_process "${ELECTRON_PID}"
  terminate_process "${RENDERER_PID}"
  terminate_process "${BACKEND_PID}"

  sleep 2

  force_kill_process "${ELECTRON_PID}"
  force_kill_process "${RENDERER_PID}"
  force_kill_process "${BACKEND_PID}"
}

on_signal() {
  EXIT_CODE=130
  cleanup
  exit "$EXIT_CODE"
}

trap on_signal INT TERM

wait_for_url() {
  local name="$1"
  local url="$2"
  local pid="$3"
  local attempts="${4:-60}"

  while (( attempts > 0 )); do
    if curl --silent --fail "$url" >/dev/null 2>&1; then
      return 0
    fi

    if ! process_running "$pid"; then
      echo "$name exited before becoming ready." >&2
      return 1
    fi

    attempts=$((attempts - 1))
    sleep 1
  done

  echo "Timed out waiting for $name at $url" >&2
  return 1
}

port_is_available() {
  local port="$1"

  python3 - "$port" <<'PY'
import socket
import sys

port = int(sys.argv[1])

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(("127.0.0.1", port))
    except OSError:
        sys.exit(1)

sys.exit(0)
PY
}

find_available_port() {
  local start_port="$1"
  local port="$start_port"
  local max_port=65535

  while (( port <= max_port )); do
    if port_is_available "$port"; then
      echo "$port"
      return 0
    fi
    port=$((port + 1))
  done

  echo "Unable to find an available port starting at $start_port" >&2
  return 1
}

echo "Building Electron main process..."
(
  cd "$ROOT_DIR/frontend"
  npm run build:electron
)

BACKEND_PORT="$(find_available_port "$DEFAULT_BACKEND_PORT")"
RENDERER_PORT="$(find_available_port "$DEFAULT_RENDERER_PORT")"
BACKEND_URL="http://127.0.0.1:${BACKEND_PORT}"
RENDERER_URL="http://127.0.0.1:${RENDERER_PORT}"

if [[ "$BACKEND_PORT" != "$DEFAULT_BACKEND_PORT" ]]; then
  echo "Backend port $DEFAULT_BACKEND_PORT is busy; using $BACKEND_PORT instead."
fi

if [[ "$RENDERER_PORT" != "$DEFAULT_RENDERER_PORT" ]]; then
  echo "Renderer port $DEFAULT_RENDERER_PORT is busy; using $RENDERER_PORT instead."
fi

echo "Starting backend..."
BACKEND_PID="$(start_process "$ROOT_DIR/backend" python3 -m uvicorn app.main:app --host 127.0.0.1 --port "$BACKEND_PORT")"
wait_for_url "backend" "${BACKEND_URL}/docs" "$BACKEND_PID"

echo "Starting renderer..."
RENDERER_PID="$(start_process "$ROOT_DIR/frontend" env VITE_API_BASE_URL="$BACKEND_URL" npm run dev:renderer -- --host 127.0.0.1 --port "$RENDERER_PORT" --strictPort)"
wait_for_url "renderer" "$RENDERER_URL" "$RENDERER_PID"

echo "Starting Electron..."
ELECTRON_PID="$(start_process "$ROOT_DIR/frontend" env NODE_ENV=development ELECTRON_RENDERER_URL="$RENDERER_URL" npm run dev:electron)"

while true; do
  if ! process_running "$BACKEND_PID"; then
    echo "Backend exited unexpectedly." >&2
    EXIT_CODE=1
    break
  fi

  if ! process_running "$RENDERER_PID"; then
    echo "Renderer exited unexpectedly." >&2
    EXIT_CODE=1
    break
  fi

  if ! process_running "$ELECTRON_PID"; then
    if ! wait "$ELECTRON_PID"; then
      EXIT_CODE=$?
    fi
    break
  fi

  sleep 1
done

cleanup
exit "$EXIT_CODE"
