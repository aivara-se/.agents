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

Work GitHub end to end with the `gh` CLI (REST fallback where noted): auth,
issues, the PR lifecycle, issue-to-PR delivery, code review, and repo
management. This skill consolidates six former skills; each workflow lives
complete in its reference file — ALWAYS read the matching reference before
starting that workflow, the body below only routes.

## Routing

| Task | Read first |
|---|---|
| Auth broken / new machine / token or SSH setup / gh login | `references/auth.md` |
| Create, triage, label, assign, close issues | `references/issues.md` |
| Branch, commit, open PR, watch CI, merge | `references/pr-workflow.md` |
| Carry an ISSUE to a verified PR (full delivery loop) | `references/issue-to-pr.md` |
| Review someone's PR: diffs, inline comments, verdict | `references/code-review.md` |
| Clone/create/fork/configure repos, org-wide policy rollout, releases | `references/repo-management.md` |

Supporting assets: `scripts/gh-env.sh` + `scripts/git-credential-token.py`
(auth helpers), `templates/` (PR bodies, bug report, feature request),
`references/ci-troubleshooting.md`, `references/conventional-commits.md`,
`references/github-api-cheatsheet.md`, `references/review-output-template.md`.

## Core discipline (applies to every workflow)

- Preflight once per session: `gh auth status` — if it fails, go to
  `references/auth.md` before anything else.
- Prefer `gh` over raw REST; drop to `gh api` only for endpoints the
  porcelain lacks (the cheatsheet lists them).
- Never report CI green without checking `gh pr checks` yourself; never
  claim merged without verifying `state,mergedAt`. After a merge, read the
  result on the base branch instead of trusting the merge commit: a squash
  or a rebase rewrites every hash and can reorder the commits, so a revert
  that was asked for is real only when the text is gone from the file on
  `main`. Then `git fetch --prune` and delete the merged local branch. Before
  reading a design document a merged PR added, `git pull --ff-only` the base
  branch first — a clone left behind still reports the file as missing.
- Read full context before writing: `gh issue view --comments` /
  `gh pr view --comments` — decisions live in threads, not titles. A review
  is not fully in the PR view either: a `CHANGES_REQUESTED` review with an
  empty body carries its feedback as inline comments, which only
  `gh api repos/{owner}/{repo}/pulls/{number}/comments` returns — fetch that
  before acting on, or answering for, what the reviewer asked.
- Sweep for duplicates before creating anything:
  `gh pr list --search` / `gh issue list --search` — and read what was closed
  with `--state all` plus the recent commits of the repo you will touch: a
  closed duplicate or a revert sitting at HEAD means the idea was already
  tried, so the proposal must say why this attempt differs or be dropped.
- Report state as state, and answer the question that was actually asked: a "are the PRs ready?" gets the state, what blocks it and the URL in a few lines — the evidence belongs in the PR body, not repeated in chat — and "give me links" gets one line per link and nothing else.

## Verification

- The workflow's own reference file defines done for that task.
- Cross-cutting: every claim about remote state (CI, merge, release,
  issue state) is backed by a fresh `gh` read, never memory.
- **Never predict a check's outcome, and remember checks belong to a sha.** A host
  integration (Cloudflare Pages, Vercel, Netlify) reports through its own app, so
  `gh pr checks` can list fewer results than exist and `--watch` can return while one
  is still pending — read the head commit both ways
  (`gh api repos/{o}/{r}/commits/<sha>/check-runs --jq '.check_runs[] | "\(.name) \(.status) \(.conclusion)"'`
  and `gh api repos/{o}/{r}/commits/<sha>/status`) before writing a check's state into
  a PR body. A host entry often links to its dashboard rather than a log, its conclusion
  is all there is, and after a push every earlier result describes a sha nobody will
  merge: when it has not reported, write what you observed and when, not what you expect.
