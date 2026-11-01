---
name: github
description: "GitHub via gh CLI: PRs, issues, reviews, repos, auth."
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

Work GitHub end to end with the `gh` CLI (REST fallback where noted). Each workflow lives complete in its reference file — read the matching one before you start; this body only routes.

## Routing

| Task | Read first |
| --- | --- |
| Auth, token or SSH setup, gh login | `references/auth.md` |
| Create, triage, label, close issues | `references/issues.md` |
| Branch, commit, open PR, watch CI, merge | `references/pr-workflow.md` |
| Carry an issue to a verified PR | `references/issue-to-pr.md` |
| Review a PR: diffs, inline comments, verdict | `references/code-review.md` |
| Clone, fork, configure repos, org policy, releases | `references/repo-management.md` |
| Measure CI cost, slow steps, and fixes | `references/ci-performance-audit.md` |

Supporting assets: `scripts/gh-env.sh`, `scripts/git-credential-token.py`, `templates/`, `references/ci-troubleshooting.md`, `references/ci-performance-audit.md`, `references/conventional-commits.md`, `references/github-api-cheatsheet.md`, `references/review-output-template.md`.

## Core discipline

- **Preflight:** `gh auth status` once per session. If it fails, read `references/auth.md` first.
- **Prefer `gh` over REST;** use `gh api` only for endpoints the porcelain lacks.
- **Never report CI green** without `gh pr checks`; never claim merged without verifying `state,mergedAt`. Read the merge result on the base branch: a squash or rebase rewrites hashes, so a revert is real only when the text is gone from the file on `main`. Then `git fetch --prune` and delete the local branch. Before reading a design doc a merged PR added, `git pull --ff-only` the base branch — a stale clone reports the file as missing.
- **Read threads before writing:** `gh issue view --comments` / `gh pr view --comments`. A `CHANGES_REQUESTED` review with an empty body keeps its feedback in inline comments, which only `gh api repos/{owner}/{repo}/pulls/{number}/comments` returns.
- **Sweep for duplicates first:** `gh pr list --search` / `gh issue list --search`, plus `--state all` and recent commits. A closed duplicate or a revert at HEAD means the idea was tried: say why this attempt differs or drop it.
- **Report state as state.** "Are the PRs ready?" gets the state, the blocker and the URL in a few lines; evidence goes in the PR body. "Give me links" gets one line per link.

## Verification

- The workflow's reference file defines done.
- Every claim about remote state (CI, merge, release, issue) comes from a fresh `gh` read, never memory.
- **Never predict a check's outcome; checks belong to a sha.** A host integration (Cloudflare Pages, Vercel, Netlify) reports through its own app, so `gh pr checks` can list fewer results than exist and `--watch` can return while one is still pending — read the head commit both ways (`gh api repos/{o}/{r}/commits/<sha>/check-runs --jq '.check_runs[] | "\(.name) \(.status) \(.conclusion)"'` and `gh api repos/{o}/{r}/commits/<sha>/status`) before writing a check's state into a PR body. A host entry often links to its dashboard, not a log. After a push, every earlier result describes a sha nobody will merge: when it has not reported, write what you observed and when.
