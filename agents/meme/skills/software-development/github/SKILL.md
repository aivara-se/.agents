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

Work GitHub with the `gh` CLI, REST where noted. Each workflow lives complete in its reference file. Read that file before you start; this body only routes.

## Routing

| Task | Read first |
| --- | --- |
| Auth broken / new machine / token or SSH setup / gh login | `references/auth.md` |
| Create, triage, label, assign, close issues | `references/issues.md` |
| Branch, commit, open PR, watch CI, merge | `references/pr-workflow.md` |
| Stacked PRs (`gh stack` extension: init, submit, sync, merge) | `references/stacked-prs.md` |
| Carry an ISSUE to a verified PR (full delivery loop) | `references/issue-to-pr.md` |
| Review someone's PR: diffs, inline comments, verdict | `references/code-review.md` |
| Clone/create/fork repos, remotes, releases | `references/repo-management.md` |
| A check is missing/pending, a workflow or job was renamed, a job or matrix arm removed | `references/ci-troubleshooting.md` |
| Author, fold or review a workflow: release, Pages deploy, permissions, artifacts | `references/actions-workflows.md` |

Supporting assets: `scripts/gh-env.sh`, `scripts/git-credential-token.py`, `templates/`, `references/conventional-commits.md`, `references/github-api-cheatsheet.md`, `references/review-output-template.md`.

## Core discipline (every workflow)

- **Preflight once per session:** `gh auth status`; if it fails, read `references/auth.md` first. `gh` is absent from the sandbox image and a rebuild drops it while `~/.config/gh/hosts.yml` survives: on `gh: command not found`, install the release tarball into `/usr/local/bin` and the existing login works untouched.
- **Prefer `gh` to raw REST**; use `gh api` only for endpoints the porcelain lacks.
- **An empty porcelain read is not an empty resource:** `gh issue view` and `gh pr view` can print nothing and exit 0. Re-read `gh api repos/{owner}/{repo}/issues/<n>` and say which read you saw.
- **The head moves while you review.** Read `HEAD=$(gh api repos/{owner}/{repo}/pulls/<n> --jq .head.sha)` just before `gh pr review` and submit only if it matches the SHA you ran; otherwise redo the work at the new head.
- **Never `APPROVE` a PR whose branch carries a commit of yours.** Read `gh api repos/{owner}/{repo}/pulls/<n>/commits`, not the body. Report the findings without that verdict and name who must decide.
- **Green comes from your own `gh pr checks`; merged from `state,mergedAt`.** An approval is not a merge, and a second-hand claim is not evidence. After the merge, read the run it triggered (`gh run list --branch <base> -L 2`) and, where published, the address a user reaches, before calling it live.
- **Fold the attempts before you push:** a `fix` into the commit it repairs, superseded designs into one, proven by an identical `git rev-parse HEAD^{tree}` (`references/pr-workflow.md`).
- **A `main`-only workflow is unproven on a PR.** `actionlint` the file and read the job graph back; a green `validate` check does not execute the release, and a gate whose version is already released runs nothing. Say which jobs never ran and when the first live one is (`references/actions-workflows.md`).
- **A rebase onto a moved `main` can duplicate your CI.** Compare `git diff --stat $(git merge-base HEAD origin/main) origin/main -- .github/workflows/`: if `main` carries the gate, keep its file, move your steps into its job, delete your own workflow and the stopgap guard, then confirm one job runs.
- **A rewrite dismisses every approval** — GitHub's doing, not a rejection: re-request review after it. `reviews[]` is a log, not a state; read the newest row per reviewer (`references/pr-workflow.md`). A rewrite also clears armed auto-merge, and `gh pr merge --auto` refuses a draft with a GraphQL error that never says so: read `gh pr view <n> --json isDraft,autoMergeRequest,reviewRequests`, mark ready, re-arm, confirm `enabledAt`.
- **A rebase conflict on a file a peer rewrote has no common hunk.** Re-apply what their change added, in your own words, before `git rebase --continue`: taking either side drops rules one change needs.
- **Write bodies to a file and pass `--body-file`.** A `--body` with backticks and quotes is mangled and `gh` fails with `accepts at most 1 arg(s)`. Keep it outside the clone (`~/.pr-bodies/<repo>-<topic>.md`): one in the repo root is untracked and a later `git add -A` commits it.
- **The remote ref proves a push, not git's output.** `! [remote rejected] <branch> -> <branch>` matches a grep for the branch and reads as success: compare `git ls-remote origin <branch>` with `git rev-parse HEAD`, and read `No commits between <base> and <branch>` as a push that never landed. On a 5xx, retry with backoff, then read the ref; read `gh pr list --head <branch>` before re-creating.
- **Read the threads:** `--comments` on the issue and PR views; decisions live there, not in titles.
- **A base rebased under your PR reports `CONFLICTING` on every shared file**, even with identical content: git matches by SHA, so a replay is an unrelated commit. Reparent with `git rebase --onto <new-base> <old-base>` and re-check `git rev-parse HEAD^{tree}`; an unchanged hash means the verification still holds.
- **`gh pr create` writes twice** — the PR, then the review requests — and the second can fail after the first. Read `gh pr view --json url,reviewRequests` before retrying, or you open a duplicate. Repair with `gh pr edit <n> --add-reviewer <a>,<b>`. A reviewer who is not a repository account is dropped silently and the create still exits 0: name the name that failed. Take `<n>` from the URL it printed.
- **The clone may be another session's:** read the branch and `git status` before any `git checkout`. Work in `git worktree add ~/wt/<topic> <branch>` and symlink the shared `node_modules`.
- **Ruleset protection answers 404** at `.../branches/<base>/protection`: read `gh api repos/{owner}/{repo}/rulesets` and the ruleset by id. `allowed_merge_methods` and `required_linear_history` decide whether a merge commit can land.
- **Deleting a workflow record needs repo admin; disabling needs push.** A push-only token gets 404 from `DELETE .../actions/workflows/<id>` and 204 from `PUT .../disable`. Disable it, ask an admin for the delete, and read `.workflows[].state` as proof.
- **Sweep for duplicates first:** `gh pr list --search` / `gh issue list --search`.

## Verification

- The workflow's own reference file defines done.
- Back every claim about remote state (CI, merge, release, issue) with a fresh `gh` read, never memory.
