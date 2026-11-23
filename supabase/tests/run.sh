#!/usr/bin/env bash
# Lance migrations + tests dans un Postgres jetable (Docker). Usage : supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
docker rm -f zoralia-test-pg >/dev/null 2>&1 || true
docker run -d --name zoralia-test-pg -e POSTGRES_PASSWORD=pw postgres:16-alpine >/dev/null
trap 'docker rm -f zoralia-test-pg >/dev/null 2>&1' EXIT
until docker exec zoralia-test-pg pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
sleep 2
psql_() { docker exec -i zoralia-test-pg psql -q -U postgres -v ON_ERROR_STOP=1 "$@"; }
psql_ < tests/harness.sql
for f in migrations/*.sql; do psql_ < "$f"; done
psql_ -t < tests/acceptance.sql
