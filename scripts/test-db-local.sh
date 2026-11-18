#!/usr/bin/env bash
# Corre las migraciones y los tests pgTAP en un Postgres local (15 o más nuevo),
# sin Docker ni Supabase CLI. Requiere psql, pg_prove y la extensión pgtap.
#
#   PGUSER=postgres ./scripts/test-db-local.sh
#
# Con Supabase CLI y Docker, lo equivalente es: supabase db reset && supabase test db
set -euo pipefail

cd "$(dirname "$0")/.."
DB="${TEST_DB:-habilitaciones_test}"

dropdb --if-exists "$DB"
createdb "$DB"
trap 'dropdb --if-exists "$DB"' EXIT

psql_db() { psql -v ON_ERROR_STOP=1 -q -X -d "$DB" "$@"; }

psql_db -c 'create schema extensions'
psql_db -f scripts/local/supabase_shim.sql
for f in supabase/migrations/*.sql; do
  echo "Aplicando $f"
  # pg_cron y pg_net no vienen en un Postgres común: el shim los imita.
  sed -E '/^create extension if not exists pg_(cron|net) /d' "$f" | psql_db
done

pg_prove -d "$DB" supabase/tests/database/*.test.sql
