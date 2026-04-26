#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_PID=""
RENDERER_PID=""
ELECTRON_PID=""
EXIT_CODE=0
IS_CLEANING_UP=0

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

echo "Building Electron main process..."
(
  cd "$ROOT_DIR/frontend"
  npm run build:electron
)

echo "Starting backend..."
BACKEND_PID="$(start_process "$ROOT_DIR/backend" python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000)"
wait_for_url "backend" "http://127.0.0.1:8000/docs" "$BACKEND_PID"

echo "Starting renderer..."
RENDERER_PID="$(start_process "$ROOT_DIR/frontend" npm run dev:renderer)"
wait_for_url "renderer" "http://127.0.0.1:5173" "$RENDERER_PID"

echo "Starting Electron..."
ELECTRON_PID="$(start_process "$ROOT_DIR/frontend" env NODE_ENV=development npm run dev:electron)"

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
