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

Work GitHub end to end with `gh` (REST fallback where noted). Each workflow lives complete in its reference file — read the matching one before starting; this body only routes.

## Routing

| Task | Read first |
| --- | --- |
| Auth broken / new machine / token or SSH setup / gh login | `references/auth.md` |
| Create, triage, label, assign, close issues | `references/issues.md` |
| Decide whether GitHub delivers an event/action, or what a payload carries | `references/webhook-events-probing.md` |
| Run or design a GitHub App: permissions, JWT, installation tokens, app delivery log | `references/github-apps.md` |
| Branch, commit, open PR, watch CI, resolve conflicts, merge | `references/pr-workflow.md` |
| Carry an ISSUE to a verified PR (full delivery loop) | `references/issue-to-pr.md` |
| Review a PR, or answer a review on your own ("check this PR"): diffs, replies, verdict | `references/code-review.md` |
| Break work into tasks with sub-issues, and put them on a Projects v2 board | `references/sub-issues-and-projects.md` |
| Clone/create/fork repos, remotes, releases; Pages source, rulesets | `references/repo-management.md` |

Supporting assets: `scripts/gh-env.sh` + `scripts/git-credential-token.py` (auth helpers), `templates/` (PR bodies, bug report, feature request), `references/ci-troubleshooting.md`, `references/conventional-commits.md`, `references/github-api-cheatsheet.md`, `references/review-output-template.md`.

## Core discipline

- **Preflight.** `gh auth status` once per session; on failure read `references/auth.md` first. In a rebuilt sandbox the binary can be missing while `~/.config/gh/hosts.yml` survives: reinstall the tarball, never `gh auth login` — the stored token is still valid (see `sandbox-toolchain`).
- **Porcelain first.** Prefer `gh`; drop to `gh api` only for endpoints the porcelain lacks (the cheatsheet lists them).
- **No unverified state.** Never report CI green without `gh pr checks`; never call a pull request merged without verifying `state,mergedAt`.
- **Threads carry the decision.** Read `gh issue view --comments` or `gh pr view --comments` before writing. To read them as data, ask for the field: `gh pr view <N> --json comments` — `gh pr view` refuses `--comments` and `--json` in the same call.
- **Sweep duplicates.** `gh pr list --search` / `gh issue list --search`, plus `git fetch origin` and `gh pr list --state all --head <branch>` before cutting a branch: a pull request can exist on a branch whose title search missed it, and a second one for one decision spends review rounds reconciling it.
- **A 404 on a repository write is a permission wall.** Check `gh api repos/O/R --jq '.permissions'` — the setting needs `admin: true`. See `references/repo-management.md`.
- **Deletion is admin-only.** Inventory the targets and check permission once. If `gh issue delete` reports `Viewer not authorized`, stop, preserve the list, and offer closing or project removal instead; never report deletion without a readback.
- **Completion prompts.** Refresh the PR metadata, head SHA, latest formal review, inline threads and comments first. Separate must-fix from carried non-blockers, name the current commit, give one bounded push-and-verify sequence — otherwise the prompt resurrects stale findings or hides a new contradiction.
- **Respect ownership.** Never tell an author to edit a protected or operator-owned file because it conflicts with the PR; name the owner and the smallest remaining action.
- **Design to cards.** One testable artifact and an explicit done check per card, with direct blocker edges, created only after the user has reviewed the decomposition.

## Verification

- The workflow's own reference defines done.
- Every claim about remote state — CI, merge, release, issue state — is a fresh `gh` read, never memory.
- **`mergeable` lags.** It is computed asynchronously. Pin `headRefOid`, confirm it against `git ls-remote origin refs/pull/<n>/head`, and reproduce the merge in a clone of the remote before calling a pull request conflicting or ready (recipe: `references/pr-workflow.md`, _Verifying merge state_).
- **A review's `state` belongs to a commit.** Read each review's `commit_id` beside the current head: a `CHANGES_REQUESTED` from before the last pushes may already be answered. `MERGEABLE` with `mergeStateStatus: blocked` is a review blocker, not a conflict.
- **Two pull requests can conflict pairwise.** Measure the hunks yourself rather than trusting a count a review states, and land the unblocked one first — whichever lands second rebases.
