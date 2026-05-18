#!/bin/sh
# Demo container entrypoint. Wipes the demo DB and reloads the rich seed
# on every boot — every screenshot session starts from a known clean state.
# Never use this entrypoint with the prod compose file: it destroys data.

set -e

# Wait for postgres (db-demo healthcheck guarantees readiness in compose,
# but this guard is here in case someone runs the container standalone).
echo "[screenshots] Waiting for database..."
until node -e "const p=require('postgres')(process.env.DATABASE_URL);p\`SELECT 1\`.then(()=>{p.end();process.exit(0)}).catch(()=>process.exit(1))" 2>/dev/null; do
  sleep 1
done

echo "[screenshots] Running migrations..."
node /app/scripts/migrate.js

echo "[screenshots] Clearing demo data..."
npx tsx /app/src/lib/db/clear.ts

echo "[screenshots] Seeding demo data..."
npx tsx /app/src/lib/db/seed.ts

echo "[screenshots] Starting Prism (dev mode)..."
exec npm run dev
