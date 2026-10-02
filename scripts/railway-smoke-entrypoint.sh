#!/bin/sh
set -eu
npm run smoke:generate
node dist/main.js &
APP_PID=$!
cleanup() { kill "$APP_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
sleep 5
HYDRAREEL_BASE_URL="http://127.0.0.1:${PORT:-3000}" SMOKE_SOURCE="/app/fixtures/hydrareel-smoke-source.mp4" node scripts/smoke-real.mjs
wait "$APP_PID"
