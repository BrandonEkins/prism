#!/bin/sh
# ============================================================================
# PRISM - Demo Reset Script
# ============================================================================
#
# Wipes all user-modifiable data from the demo database and reseeds it from
# the canonical 03-seed.sql. Designed to run nightly via cron on the demo
# host so visitors always start from a known-good state.
#
# Usage (from demo host):
#   /opt/prism/scripts/demo-reset.sh
#
# Cron example (midnight UTC nightly):
#   0 0 * * * /opt/prism/scripts/demo-reset.sh >> /var/log/prism-demo-reset.log 2>&1
#
# Assumes:
#   - Docker compose stack is running (containers prism-db, prism-app, prism-redis)
#   - 03-seed.sql is mounted at /docker-entrypoint-initdb.d/03-seed.sql
#     (this is already true via docker-compose.yml volume mount)
#
# ============================================================================

set -e

DB_CONTAINER="${DB_CONTAINER:-prism-db}"
APP_CONTAINER="${APP_CONTAINER:-prism-app}"
REDIS_CONTAINER="${REDIS_CONTAINER:-prism-redis}"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Demo reset starting"

# 1. Truncate every user-data table in public schema. Excludes the migration
#    bookkeeping table so Drizzle's idempotent migrations stay in sync.
docker exec "$DB_CONTAINER" psql -U prism -d prism <<'SQL'
DO $$
DECLARE
  truncate_list TEXT;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
    INTO truncate_list
    FROM pg_tables
   WHERE schemaname = 'public'
     AND tablename NOT IN ('__prism_migrations');
  IF truncate_list IS NOT NULL THEN
    EXECUTE format('TRUNCATE TABLE %s RESTART IDENTITY CASCADE', truncate_list);
  END IF;
END $$;
SQL

echo "  - tables truncated"

# 2. Reapply seed (the seed has its own "skip if users exist" guard, but we
#    just truncated users so it will run).
docker exec "$DB_CONTAINER" psql -U prism -d prism -f /docker-entrypoint-initdb.d/03-seed.sql

echo "  - seed reapplied"

# 3. Flush Redis so cached responses don't leak across the reset boundary.
docker exec "$REDIS_CONTAINER" redis-cli FLUSHDB > /dev/null

echo "  - redis flushed"

echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Demo reset complete"
