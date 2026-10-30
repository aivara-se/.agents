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
| Stacked PRs (`gh stack` extension: init, submit, sync, merge) | `references/stacked-prs.md` |
| Carry an ISSUE to a verified PR (full delivery loop) | `references/issue-to-pr.md` |
| Review someone's PR: diffs, inline comments, verdict | `references/code-review.md` |
| Clone/create/fork repos, remotes, releases | `references/repo-management.md` |
| A check is missing/pending, a workflow or job was renamed | `references/ci-troubleshooting.md` |

Supporting assets: `scripts/gh-env.sh` + `scripts/git-credential-token.py`
(auth helpers), `templates/` (PR bodies, bug report, feature request),
`references/ci-troubleshooting.md`, `references/conventional-commits.md`,
`references/github-api-cheatsheet.md`, `references/review-output-template.md`.

## Core discipline (applies to every workflow)

- Preflight once per session: `gh auth status` — if it fails, go to
  `references/auth.md` before anything else. `gh` itself is not in my sandbox
  image (a rebuild drops it while `~/.config/gh/hosts.yml` survives): on
  `gh: command not found`, install the release tarball into
  `/usr/local/bin` and the existing login works untouched.
- Prefer `gh` over raw REST; drop to `gh api` only for endpoints the
  porcelain lacks (the cheatsheet lists them).
- An empty result from a porcelain read is not proof the resource is empty:
  `gh issue view` and `gh pr view` can print nothing and still exit 0. Re-read
  the raw endpoint (`gh api repos/{owner}/{repo}/issues/<n>`) before
  concluding, and say which read you saw.
- A pull request's head can move while you review it (the author pushes a fix mid-review): re-read the head SHA from the API immediately before submitting, and submit only when it still matches the SHA you actually ran — `HEAD=$(gh api repos/{owner}/{repo}/pulls/<n> --jq .head.sha)`, compare, then `gh pr review`. A review filed against a superseded SHA answers a question the branch no longer asks; when the head moves, redo the work at the new head rather than posting the old verdict.
- Never submit `APPROVE` on a pull request whose branch carries a commit of yours (read `gh api repos/{owner}/{repo}/pulls/<n>/commits`, not the body): the approval has to come from a reviewer who has written nothing on that branch. Record what you found, submit it without the verdict you are not entitled to give, and name who must decide (the other reviewer on the record, or the operator).
- Never report CI green without checking `gh pr checks` yourself; never
  claim merged without verifying `state,mergedAt`. **An approval is not a
  merge** — a PR a reviewer approved sits open until someone merges it, and a
  second-hand "it is merged" is not evidence either. After the merge, read the
  run it triggered (`gh run list --branch <base> -L 2`) and, where the change
  is published, the address a user reaches it at, before calling it live.
- A branch is not ready to push while it still carries its own attempts: fold a `fix` that
  repairs the branch's previous commit into it, and fold superseded designs into one commit,
  proving the rewrite with an identical `git rev-parse HEAD^{tree}` before and after
  (`references/pr-workflow.md`).
- A rebase onto a moved `main` can land a second copy of your own CI. If the branch adds a workflow for the gate and `main` gained one for the same gate meanwhile, both files survive the rebase and every pull request runs the gate twice; `gh pr checks` shows two jobs where one belongs. Compare before rebasing — `git diff --stat $(git merge-base HEAD origin/main) origin/main -- .github/workflows/` —  and when `main` already carries the gate, keep its file: move your steps into its job, delete the stopgap guard and the comments it no longer needs, drop your own workflow, then confirm one job runs.
- A rewrite of the branch — amend, rebase, `--force-with-lease` — dismisses every approval on the pull request. That is GitHub's doing, not a rejection: after the rewrite, re-request review from the reviewers whose verdict matters, or the pull request sits blocked behind a state that no longer exists. `reviews[]` is a log, not a state — read the newest row per reviewer (`references/pr-workflow.md`, *Review on your own PR*). The same rewrite can clear the armed auto-merge, and `gh pr merge --auto` refuses a draft with a GraphQL error that never says so — read `gh pr view <n> --json isDraft,autoMergeRequest,reviewRequests` after the push, mark it ready, then re-arm and confirm `enabledAt` is set.
- When a rebase conflicts on a file a peer pull request rewrote while you did, there is no common hunk to keep: re-apply what their change added into your structure, in your own words, before `git rebase --continue`. Taking either side wholesale drops rules one of the two changes needs, and the resolution commit hides which was dropped.
- Write a PR body or a long review reply to a file and pass `--body-file <path>`: a `--body` argument carrying backticks and quotes is mangled by the shell, and `gh` fails with `accepts at most 1 arg(s)`. The file also makes the text re-editable for the next round. Write it outside the clone (`~/.pr-bodies/<repo>-<topic>.md`): a body file in the repository root is an untracked file that `git status` reports and a later `git add -A` sweeps into the commit.
- Read full context before writing: `gh issue view --comments` /
  `gh pr view --comments` — decisions live in threads, not titles.
- A pull request whose base branch was rebased or force-pushed under it reports `CONFLICTING` on every file both sides touch, even when the content is identical: git matches commits by SHA, so the same change replayed onto the base is an unrelated commit, and both branches look like they are adding the same paths. Fix it by reparenting your own commits — `git rebase --onto <new-base> <old-base>`, where `<old-base>` is the commit your branch was built on — and check `git rev-parse HEAD^{tree}` against the tree you verified before pushing: an unchanged hash means the verification still holds, only the parent moved.
- `gh pr create` performs two writes — the pull request and the review requests — and the second can fail after the first succeeded. On a GraphQL or reviewer error, read `gh pr view --json url,reviewRequests` before retrying, because a blind retry opens a duplicate PR; set the reviewers with `gh pr edit <n> --add-reviewer <a>,<b>` and confirm `reviewRequests` lists both. A `--reviewer` name that is not an account on the repository is dropped without an error — the create still exits 0 and prints the URL — so read `gh pr view <n> --json reviewRequests` and say in the reply which reviewer could not be added instead of leaving the record looking complete. Take `<n>` from the URL the create printed — never infer it from the last pull request, or `gh pr edit` adds your reviewers to someone else's open pull request.
- Sweep for duplicates before creating anything:
  `gh pr list --search` / `gh issue list --search`.

## Verification

- The workflow's own reference file defines done for that task.
- Cross-cutting: every claim about remote state (CI, merge, release,
  issue state) is backed by a fresh `gh` read, never memory.
