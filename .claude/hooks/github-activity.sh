#!/usr/bin/env bash
# SessionStart hook — surface open PRs and issues so they don't sit unseen.
#
# Output goes straight to Claude's session-start context. Keep it terse:
# numbers, titles, draft/open state, author. No commentary.
#
# Silent on failure (no gh, no network, no repo binding) — never block session start.

set -u

# Bail quietly if gh isn't available or this isn't a GitHub-bound repo.
command -v gh >/dev/null 2>&1 || exit 0
gh repo view --json name >/dev/null 2>&1 || exit 0

# Use gh's built-in --jq (gojq) so we don't depend on system jq.
prs=$(gh pr list --state open --limit 20 --json number,title,author,isDraft,createdAt --jq '
  sort_by(.createdAt) | reverse | .[] |
  "- #\(.number) \(if .isDraft then "(draft) " else "" end)\(.title) — @\(.author.login)"
' 2>/dev/null)

issues=$(gh issue list --state open --limit 20 --json number,title,author,createdAt --jq '
  sort_by(.createdAt) | reverse | .[] |
  "- #\(.number) \(.title) — @\(.author.login)"
' 2>/dev/null)

pr_count=$(printf '%s\n' "$prs" | grep -c '^- ' || true)
issue_count=$(printf '%s\n' "$issues" | grep -c '^- ' || true)

echo "## GitHub activity"
echo ""

if [ "$pr_count" -eq 0 ] && [ "$issue_count" -eq 0 ]; then
  echo "No open PRs or issues."
  exit 0
fi

if [ "$pr_count" -gt 0 ]; then
  echo "**Open PRs ($pr_count):**"
  printf '%s\n' "$prs"
  echo ""
fi

if [ "$issue_count" -gt 0 ]; then
  echo "**Open issues ($issue_count):**"
  printf '%s\n' "$issues"
fi
