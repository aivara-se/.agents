---
name: github
description: "GitHub via gh CLI: PRs, issues, reviews, repos, auth."
version: 2.0.0
author: Ben Barclay (benbarclay), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [github, gh, git, pull-requests, issues, code-review, repos, auth, ci]
    category: software-development
    related_skills: [codebase-inspection, requesting-code-review]
---

# GitHub

Work GitHub end to end with `gh`, REST as fallback. Each workflow lives complete in its reference file. Read that file first; this body only routes.

## Routing

| Task | Read first |
| --- | --- |
| Auth broken / new machine / token, SSH, login | `references/auth.md` |
| Create, triage, label, close issues | `references/issues.md` |
| Branch, commit, open PR, watch CI, merge | `references/pr-workflow.md` |
| Carry an ISSUE to a verified PR | `references/issue-to-pr.md` |
| Review a PR: diffs, inline comments, verdict | `references/code-review.md` |
| Audit a review loop: rounds, churn, scope drift | `references/review-history-audit.md` |
| Clone, fork, remotes, releases | `references/repo-management.md` |

Supporting assets: `scripts/gh-env.sh` + `scripts/git-credential-token.py` (auth helpers), `templates/` (PR bodies, bug report, feature request), `references/ci-troubleshooting.md`, `references/conventional-commits.md`, `references/github-api-cheatsheet.md`, `references/review-output-template.md`, `references/review-history-audit.md`.

## Core discipline (every workflow)

- Preflight: `gh auth status`. If it fails, read `references/auth.md` first.
- Prefer `gh` to raw REST. `gh api` only for endpoints the porcelain lacks.
- Run `gh pr checks` before you call CI green. Check `state,mergedAt` before you call a PR merged.
- Read the thread before you write: `gh issue view --comments`, `gh pr view --comments`. Decisions live there, not in titles.
- Search before you create: `gh pr list --search`, `gh issue list --search`.

## Verification

- The workflow's reference file defines done for that task.
- Back every claim about remote state with a fresh `gh` read, never memory.
