#!/usr/bin/env bash
# Verifies that package.json's version field matches the most recent
# versioned heading in docs/CHANGELOG.md (the "## [X.Y.Z] – ..." line that
# sits below "## Unreleased"). Fails CI if they drift.
#
# Run manually:   bash scripts/check-version-sync.sh
# Wired into CI:  .github/workflows/ci.yml (typecheck-lint job)
#
# Rationale for the check: every release lives in two files (package.json
# bumps the source of truth, CHANGELOG records the user-facing notes). If
# one is updated without the other, downstream surfaces drift — the GH
# Pages docs site shows old release notes, or the dashboard reports an
# old version. Single-pass check, no external deps beyond node.

set -euo pipefail

cd "$(dirname "$0")/.."

VERSION=$(node -p "require('./package.json').version")
CHANGELOG_TOP=$(grep -E '^## \[[0-9]+\.[0-9]+\.[0-9]+\]' docs/CHANGELOG.md | head -1 \
  | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || true)

if [[ -z "$CHANGELOG_TOP" ]]; then
  echo "ERROR: docs/CHANGELOG.md has no versioned section heading."
  echo "       Expected a line matching '## [X.Y.Z] – ...' under '## Unreleased'."
  exit 1
fi

if [[ "$CHANGELOG_TOP" != "$VERSION" ]]; then
  echo "ERROR: version drift detected."
  echo "  package.json:        $VERSION"
  echo "  CHANGELOG.md (top):  $CHANGELOG_TOP"
  echo ""
  echo "Run 'bash scripts/release.sh <new-version>' to bump both in lockstep,"
  echo "or update the lagging file by hand and re-run this check."
  exit 1
fi

echo "✓ package.json ($VERSION) matches CHANGELOG.md top section"
