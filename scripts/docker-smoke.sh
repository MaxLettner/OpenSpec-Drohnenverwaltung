#!/usr/bin/env bash
# Checks the container scenarios of the deployment spec, requirement "Run as a container" (REQ-010).
# Uses its own compose project and port, and removes its container and volume when it ends.
set -euo pipefail
cd "$(dirname "$0")/.."

export PORT="${SMOKE_PORT:-18080}"
export SAMPLE_DATA=false
compose=(docker compose -p drone-smoke)
base="http://localhost:$PORT"

fail() { echo "FAIL: $*" >&2; exit 1; }
cleanup() { "${compose[@]}" down -v --remove-orphans >/dev/null 2>&1 || true; }
trap cleanup EXIT

up() {
  "${compose[@]}" up -d "$@" >/dev/null 2>&1 || fail "docker compose up failed"
  for _ in $(seq 60); do
    curl -fs "$base/api/drones" >/dev/null && return
    sleep 1
  done
  fail "the API did not answer on $base"
}
drones() { curl -fs "$base/api/drones"; }

cleanup

echo "Scenario: Start the container"
up --build
curl -fs "$base/" | grep -q "<app-root" || fail "/ does not return the web app"
curl -fs "$base/loans" | grep -q "<app-root" || fail "/loans does not return the web app"
[ "$(drones)" = "[]" ] || fail "the drone list is not empty"
echo "  ok"

echo "Scenario: Recreate the container"
curl -fs -X POST -H "Content-Type: application/json" -d '{"name":"TELLO-07"}' "$base/api/drones" >/dev/null \
  || fail "creating TELLO-07 failed"
"${compose[@]}" down >/dev/null 2>&1
up
drones | grep -q '"TELLO-07"' || fail "TELLO-07 is gone after recreating the container"
echo "  ok"

echo "Scenario: Remove the volume"
"${compose[@]}" down -v >/dev/null 2>&1
up
[ "$(drones)" = "[]" ] || fail "the drone list is not empty after removing the volume"
echo "  ok"

echo "All container scenarios passed."
