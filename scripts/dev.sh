#!/usr/bin/env bash
# Backend (auto-reload on Python and content JSON changes) + Vite dev server.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${GRIMOIRE_PORT:-8010}"

trap 'kill 0' EXIT

(
  cd "$ROOT/backend"
  uv run uvicorn grimoire.main:app --host "${GRIMOIRE_HOST:-0.0.0.0}" --port "$PORT" \
    --reload --reload-dir src --reload-dir "$ROOT/content" --reload-include '*.json'
) &

(cd "$ROOT/frontend" && bun run dev) &

wait
