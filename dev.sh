#!/usr/bin/env bash
#
# Run the whole Vineflow stack (Postgres + backend + frontend) from one place.
#
#   ./dev.sh           start everything
#   ./dev.sh --seed    also seed the permission catalog + demo account
#
# Ctrl+C stops the backend and frontend together.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
DB_HOST_PORT="${DB_HOST_PORT:-5432}"

SEED=0
[ "${1:-}" = "--seed" ] && SEED=1

log() { printf "\033[1;35m[dev]\033[0m %s\n" "$*"; }

# 1. Postgres --------------------------------------------------------------
if docker ps --format '{{.Names}}' | grep -q '^vineflow-db$'; then
  log "Postgres already running."
else
  log "Starting Postgres (host port ${DB_HOST_PORT})..."
  DB_HOST_PORT="$DB_HOST_PORT" docker compose -f "$ROOT/docker-compose.yml" up -d db
  log "Waiting for Postgres to be healthy..."
  for _ in $(seq 1 30); do
    [ "$(docker inspect -f '{{.State.Health.Status}}' vineflow-db 2>/dev/null)" = "healthy" ] && break
    sleep 1
  done
fi

# 2. Backend: deps + migrations -------------------------------------------
log "Syncing backend deps and applying migrations..."
(cd "$BACKEND" && uv sync --quiet && uv run alembic upgrade head)
if [ "$SEED" = "1" ]; then
  log "Seeding database..."
  (cd "$BACKEND" && uv run python -m scripts.seed)
fi

# 3. Frontend: deps --------------------------------------------------------
if [ ! -d "$FRONTEND/node_modules" ]; then
  log "Installing frontend deps..."
  (cd "$FRONTEND" && pnpm install)
fi

# 4. Run both, tear down together -----------------------------------------
pids=()
cleanup() {
  log "Shutting down..."
  for pid in "${pids[@]:-}"; do kill "$pid" 2>/dev/null || true; done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

(cd "$BACKEND" && exec uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000) &
pids+=($!)
(cd "$FRONTEND" && exec pnpm dev) &
pids+=($!)

log "Backend  -> http://localhost:8000/docs"
log "Frontend -> http://localhost:3000"
wait
