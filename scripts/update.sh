#!/bin/bash
# update.sh — Update Prism to the latest version
#
# Stable releases use the published GHCR image and do not rebuild Next.js
# locally. Feature branches fall back to a source build.
# Database migrations run automatically when the container restarts.
#
# Usage: ./scripts/update.sh [--source|--prebuilt]

set -e

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif docker-compose version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "Docker Compose is required." >&2
  exit 1
fi

MODE="auto"
case "${1:-}" in
  --source) MODE="source" ;;
  --prebuilt) MODE="prebuilt" ;;
  "") ;;
  *) echo "Usage: $0 [--source|--prebuilt]" >&2; exit 2 ;;
esac

BRANCH=$(git branch --show-current)
if [ "$MODE" = "auto" ]; then
  case "$BRANCH" in
    master|main) MODE="prebuilt" ;;
    *) MODE="source" ;;
  esac
fi

echo "Fetching latest code on ${BRANCH:-detached HEAD}..."
git fetch origin
if [ "$BRANCH" = "master" ] || [ "$BRANCH" = "main" ]; then
  git pull --ff-only
fi

if [ "$MODE" = "prebuilt" ]; then
  echo "Pulling published app image (skipping local Next.js build)..."
  $COMPOSE -f docker-compose.yml -f docker-compose.prebuilt.yml pull app
  $COMPOSE -f docker-compose.yml -f docker-compose.prebuilt.yml up -d --no-build app
else
  echo "Building from source for branch ${BRANCH:-detached HEAD}..."
  $COMPOSE up -d --build app
fi

echo ""
echo "Prism updated. Migrations run automatically on startup."
echo "Check logs with: $COMPOSE logs -f app"
