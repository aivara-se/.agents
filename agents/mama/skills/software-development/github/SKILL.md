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
| Decide whether GitHub delivers an event/action, or what a payload carries | `references/webhook-events-probing.md` |
| Branch, commit, open PR, watch CI, merge | `references/pr-workflow.md` |
| Carry an ISSUE to a verified PR (full delivery loop) | `references/issue-to-pr.md` |
| Review a PR, or answer a review on your own ("check this PR"): diffs, replies, verdict | `references/code-review.md` |
| Break work into tasks with sub-issues, and put them on a Projects v2 board | `references/sub-issues-and-projects.md` |
| Clone/create/fork repos, remotes, releases | `references/repo-management.md` |

Supporting assets: `scripts/gh-env.sh` + `scripts/git-credential-token.py`
(auth helpers), `templates/` (PR bodies, bug report, feature request),
`references/ci-troubleshooting.md`, `references/conventional-commits.md`,
`references/github-api-cheatsheet.md`, `references/review-output-template.md`.

## Core discipline (applies to every workflow)

- Preflight once per session: `gh auth status` — if it fails, go to
  `references/auth.md` before anything else. In a rebuilt sandbox the binary
  can be gone while `~/.config/gh/hosts.yml` survives (`gh: command not
  found`): reinstall from the release tarball instead of running `gh auth
  login`, the stored token is still valid —
  `VER=$(curl -s https://api.github.com/repos/cli/cli/releases/latest | jq -r .tag_name | sed 's/^v//') && curl -sSL -o /tmp/gh.tar.gz https://github.com/cli/cli/releases/download/v$VER/gh_${VER}_linux_amd64.tar.gz && tar xzf /tmp/gh.tar.gz -C /tmp && install -m755 /tmp/gh_${VER}_linux_amd64/bin/gh /usr/local/bin/gh`.
- Prefer `gh` over raw REST; drop to `gh api` only for endpoints the
  porcelain lacks (the cheatsheet lists them).
- Never report CI green without checking `gh pr checks` yourself; never
  claim merged without verifying `state,mergedAt`.
- Read full context before writing: `gh issue view --comments` /
  `gh pr view --comments` — decisions live in threads, not titles.
- Sweep for duplicates before creating anything:
  `gh pr list --search` / `gh issue list --search`. Before cutting a
  branch, also `git fetch origin` and `gh pr list --state all --head
  <branch>`: a pull request can already exist on a branch whose title
  search missed, and a second pull request for one decision is the
  duplicate the review loop then spends rounds reconciling.
- A `404 Not Found` on a repository write (settings, topics, description) is
  usually a permission wall, not a missing repo: check `gh api repos/O/R
  --jq '.permissions'` — the setting needs `admin: true`. See
  `references/repo-management.md`.
- Before bulk-deleting issues, inventory the exact targets and check the
  repository permission once. Issue deletion is an admin-only destructive
  operation; if `gh issue delete` reports `Viewer not authorized`, stop the
  loop, preserve the target list, and offer closing or removing from the
  project instead. Never report deletion without a fresh readback.
- When handing an author a completion prompt, refresh the PR metadata, current
  head SHA, latest formal review, inline threads and conversation comments
  first. Separate must-fix items from carried non-blockers, name the exact
  current commit, and give one bounded push-and-verify sequence; otherwise a
  prompt can resurrect stale findings or hide a newly added contradiction.
- Do not instruct an author to edit a protected or operator-owned file merely
  because it conflicts with the PR. Identify the owner and state the smallest
  remaining action instead; review guidance must respect repository ownership.
- When turning a design into work, define each card by a testable artifact and
  an explicit done check, then record direct blocker edges on the blocked cards.
  Create the cards only after the user has reviewed the proposed decomposition;
  a dependency graph is clearer and safer than a list whose ordering is implied.

## Verification

- The workflow's own reference file defines done for that task.
- Cross-cutting: every claim about remote state (CI, merge, release,
  issue state) is backed by a fresh `gh` read, never memory.
- Never report merge state from `mergeable` alone: it is computed
  asynchronously and lags a push. Pin `headRefOid`, confirm it against
  `git ls-remote origin refs/pull/<n>/head`, and reproduce the merge in a
  clone of the remote before calling a pull request conflicting or ready
  (recipe: `references/pr-workflow.md`, *Verifying merge state*).
- A review's `state` belongs to the commit it was made against: read each
  review's `commit_id` beside the current head before calling a pull request
  blocked on its author, because a `CHANGES_REQUESTED` from before the last
  pushes may already be answered. `mergeable: MERGEABLE` with
  `mergeStateStatus: blocked` is a review blocker, not a conflict.
- Two pull requests can each merge cleanly into the base and still conflict
  with each other. Measure the hunks yourself rather than trusting a count a
  review states, and land the unblocked one first — whichever lands second
  rebases.
