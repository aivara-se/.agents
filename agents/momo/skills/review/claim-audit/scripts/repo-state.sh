#!/usr/bin/env bash
# Print the live facts a status claim is checked against:
# releases, open pull requests with their review state, open issues with owners.
# Usage: repo-state.sh aivara-se/pereda aivara-se/dispatch ...
set -uo pipefail

for r in "$@"; do
  echo "=== $r"
  gh release list -R "$r" -L 3 --json tagName,publishedAt,isLatest \
    --jq '.[] | "release \(.tagName) \(.publishedAt) latest=\(.isLatest)"' 2>&1
  gh pr list -R "$r" --state open -L 20 \
    --json number,title,author,mergeable,reviewDecision,headRefOid \
    --jq '.[] | "pr \(.number) merge=\(.mergeable) rev=\(.reviewDecision // "none") head=\(.headRefOid[0:8]) \(.author.login) | \(.title)"' 2>&1
  gh issue list -R "$r" --state open -L 20 \
    --json number,title,assignees,labels \
    --jq '.[] | "issue \(.number) owners=[\([.assignees[].login] | join(","))] labels=[\([.labels[].name] | join(","))] | \(.title)"' 2>&1
  echo
done
