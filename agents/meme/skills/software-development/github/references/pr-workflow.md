# GitHub Pull Request Workflow

Manage the PR lifecycle. Each part shows the `gh` way first, then the `git` + `curl` fallback for machines without `gh`.

## Prerequisites

- Authenticated with GitHub (see `github-auth` skill).
- Inside a git repository with a GitHub remote.

### Auth detection

```bash
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  AUTH="gh"
else
  AUTH="git"
  if [ -z "$GITHUB_TOKEN" ]; then
    if _hermes_env="${HERMES_HOME:-$HOME/.hermes}/.env"; [ -f "$_hermes_env" ] && grep -q "^GITHUB_TOKEN=" "$_hermes_env"; then
      GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$_hermes_env" | head -1 | cut -d= -f2 | tr -d '\n\r')
    elif grep -q "github.com" ~/.git-credentials 2>/dev/null; then
      GITHUB_TOKEN=$(uv run python "${HERMES_HOME:-$HOME/.hermes}/skills/github/github-auth/scripts/git-credential-token.py")
    fi
  fi
fi
```

### Owner and repo from the remote

```bash
REMOTE_URL=$(git remote get-url origin)
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
```

---

## 1. Branch creation

```bash
git fetch origin
git checkout main && git pull origin main
git checkout -b feat/add-user-authentication
```

Prefixes: `feat/`, `fix/`, `refactor/`, `docs/`, `ci/`.

## 2. Commits

Conventional Commits:

```
type(scope): short description

Longer explanation if needed. Wrap at 72 characters.
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `ci`, `chore`, `perf`.

### Fold the attempts before the branch leaves the machine

The PR history is part of the deliverable. A branch carrying a design the next commit replaces, or a `fix:` that repairs its own previous commit, reads as uncertainty and gets sent back.

- A repair that belongs to the commit above it: turn that `pick` into `fixup`, non-interactively. `git rebase -i` runs `$GIT_SEQUENCE_EDITOR` on the todo file, so a script that seds one line does the work:

```bash
printf '#!/bin/sh\nsed -i "s/^pick <sha>/fixup <sha>/" "$1"\n' > ~/.hermes/cache/scratch/fold.sh
chmod +x ~/.hermes/cache/scratch/fold.sh
GIT_SEQUENCE_EDITOR=~/.hermes/cache/scratch/fold.sh git rebase -i <commit-before-the-pair>
```

- A chain of superseded attempts whose last commit holds the shape you want: `git reset --soft HEAD~N`, then one commit describing the final shape.
- **Prove the fold changed nothing else:** `git rev-parse HEAD^{tree}` must be identical before and after. An unchanged hash means every measurement of the tree still holds, and it is the one check that makes a rewrite safe to push.

## 3. Push and create the PR

```bash
git push -u origin HEAD
gh pr create --title "feat: add JWT-based user authentication" --body-file /root/pr-body.md
```

For a body longer than a line, write it to a file and pass `--body-file <path>`, keeping that file outside the Hermes home (`/root/pr-body.md`, not `~/.hermes/...`): the file tool refuses any path under `~/.hermes`, the per-task mirror the sandbox will not write through (the terminal can still write there, which is why the CI-log commands below use it). A human reads the body the moment it lands: re-read it before creating, state the gate you actually ran with its real numbers, and flag anything that belongs to another PR instead of folding it into this one.

With curl, POST `title`, `body`, `head` and `base` to `/repos/$OWNER/$REPO/pulls`, adding `"draft": true` for a draft. The response JSON carries the PR `number`.

## 4. CI status

```bash
gh pr checks
gh pr checks --watch      # polls every 10s
```

- **Read the workflow file before calling the branch green.** A repo's check job often runs type check, formatting and build and never the tests, so "checks passed" means the gate ran. Name the steps in your report.
- A row passing while the platform's analysis jobs (CodeQL and friends) are pending is a partial, not a green. Report each check by name with its own state; call the branch clear only when every row is.

With curl, read `/commits/$SHA/status` (commit statuses) and `/commits/$SHA/check-runs` (Actions) — two endpoints, and neither covers the other.

## 5. Fixing a CI failure

```bash
gh run list --branch $(git branch --show-current) --limit 5
gh run view <RUN_ID> --log-failed
```

With curl, download `/actions/runs/$RUN_ID/logs` as a zip into `~/.hermes/cache/scratch` and extract it.

Then fix with `patch`/`write_file`, `git add <files>`, `git commit -m "fix: resolve CI failure in <check_name>"`, `git push`, and re-check.

Auto-fix loop: read the status, read the failing log, fix, push, wait, repeat. Give up after three attempts and ask.

## 6. Review on your own PR

A `CHANGES_REQUESTED` review blocks the merge. Read it in full first: the summary says what is wrong, the inline notes carry the detail.

```bash
gh pr view N --json state,reviewDecision,mergeStateStatus,reviews
gh api repos/{owner}/{repo}/pulls/N/comments -q '.[] | {author:.user.login,path,line,body}'
```

Apply the notes, comment on the PR saying so, then request the review again — re-requesting is what clears `CHANGES_REQUESTED`:

```bash
gh pr comment N --body "Applied in <sha>: …"
gh pr edit N --remove-reviewer <user>
gh pr edit N --add-reviewer <user>
```

### Read the round before touching the branch

A round leaves comments in three places and no single read shows all of them: `gh pr view N --json state,reviewDecision,headRefOid,reviews` (verdicts), `gh api repos/{owner}/{repo}/pulls/N/comments` (inline notes, each with the commit it was left on), and `gh api repos/{owner}/{repo}/issues/N/comments` (the conversation and your replies).

- **`reviews[]` is a log, not a state.** Read the newest row per reviewer and compare its `commit_id` with `headRefOid`: a verdict on an older commit answers code that no longer exists.
- A reviewer who withdraws a request for changes leaves both rows; the later one wins.
- A force-push dismisses every approval, recorded as `DISMISSED`. Re-request after the rewrite: a dismissed approval blocks nothing and approves nothing.
- Fold the round's fixes into the branch's single commit before re-requesting. A `fix: address review` commit reads as a conversation, not a change; the tree-hash check in _Fold the attempts_ proves the fold lost nothing.

**Answer each inline note in its own thread** — a top-level comment leaves the reader matching points to replies. Comment ids are in no `pr view` output, so fetch them first (an `outdated` note still takes a reply):

```bash
gh api repos/$OWNER/$REPO/pulls/N/comments --jq '.[] | {id, path, line, body}'
gh api --method POST repos/$OWNER/$REPO/pulls/N/comments/<id>/replies -F body=@/abs/path/reply.md
```

- **Write the reply after the fix is pushed, never before.** A comment describing work not yet in the branch reads as done and has to be deleted to unsay it. Draft the body into a file, re-read it, then post with `-F body=@file`.
- Name the commit that carries the fix and the numbers you re-verified; the operator reads the round, not the diff.
- A suggestion is a line to apply, not a spec to reinterpret: land it as written and keep disagreement for a reply.
- A reviewer may not be addable — not everyone on the project is a collaborator. Report which names the request accepted.
- When `--json` rejects a field with `Unknown JSON field`, the error lists the real fields. Read the list.

## 7. Merging

Read the landing state in one call: `gh pr view N --json state,mergeable,reviewDecision`. `MERGEABLE` says only that the branches do not conflict; branch protection can still hold the PR at `REVIEW_REQUIRED`, which is the state to report — ready, not landable.

Match the method the base history already uses: a linear base whose commits carry the branch's own messages means **rebase**; a base of `type: subject (#N)` rows means squash. Read it with `git log --oneline --graph <base>` first. A squash flattens the story the branch wrote; a rebase rewrites every SHA, so re-read the landed SHA before quoting one.

**An approval is not a merge.** `gh pr view N --json state,mergedAt` is the only evidence a PR landed. The merge starts the rest: read the run it triggers (`gh run list --branch <base> -L 2`) and, where the change is published, the address a user reaches (`curl -sL -w '%{http_code}' <url>` — a static host 301s a directory URL to its trailing slash, and a bare `-s` reads that as a failed deploy — then grep the served page for a string the change introduced: a `200` proves the host answered, not that this change is live). An Actions read can lag the run's real state — `queued`/`in_progress` on a finished run is a stale read, so re-query before reporting it stuck.

```bash
gh pr merge N --rebase --delete-branch
gh pr merge --auto --squash --delete-branch
```

### After a rebase merge, local branches still look unmerged

A rebase merge rewrites every commit, so `git rev-list --count origin/main..<branch>` stays non-zero on a branch that landed and `git branch -d` refuses it. Prove publication with `git cherry -v origin/main <branch>`: a line starting `-` means the patch is equivalent to one upstream; `+` is work that never landed. Answer "anything unpublished?" with `git status --porcelain` and `git stash list` in every clone and linked worktree, then `git cherry` per local branch. An untracked core dump or a stale branch is not unpublished work; name it as such rather than deleting it unasked.

### A conflicted branch in a rebase-only repo

`gh pr merge --rebase` failing with `GraphQL: This branch can't be rebased (mergePullRequest)` means the branch carries a merge commit — usually one added to settle a conflict — and the ruleset allows rebase only. Read the enforced method before resolving, because every push that moves the head dismisses the approval:

```bash
gh api repos/{owner}/{repo}/rulesets          # branch protection 404s when rulesets carry the rules
gh api repos/{owner}/{repo}/rulesets/<id> --jq '.rules[] | select(.type=="pull_request")'
```

Rebuild a linear branch on the current base, proving the content is unchanged:

```bash
git rev-parse HEAD^{tree}                     # the tree you already verified
# resolve the conflict first: keep the base's file, re-apply only your hunk
git checkout -B <branch> origin/main
git checkout <verified-commit> -- <the files your change owns>   # resolved content, base's history
git commit -C <old-head>
git rev-parse HEAD^{tree}                     # must equal the tree above
```

- Do not run `git rebase --onto origin/main <old-base>` on a branch that already contains a merge commit: the replayed range includes the merge's other side, so git re-applies the base's own commits and conflicts on files you never touched. Rebuild from `origin/main`.
- When both sides appended to a file, take the base version and re-apply your hunk at its position. Taking your copy wholesale deletes what the base added.
- Push once with `--force-with-lease=<branch>:<old-head>`, then re-request the reviewer: the push dismissed the approval, and `require_last_push_approval` wants a verdict at the new head.

### Why is this PR not landing?

A queue review is a state read, not a diff read. Enumerate the whole org and prove the count before naming anything:

```bash
gh search prs --owner <org> --state open --json repository,number,title,author
for r in $(gh api /orgs/<org>/repos --jq '.[].full_name'); do
  printf '%s ' "$r"; gh pr list -R "$r" --state open --limit 100 --json number --jq length
done
```

The two totals must agree. `gh search` returns at most 30 per page and skips a repository the token cannot read, so a per-repository count is the completeness check.

Then read the blocker per pull request in one call: `gh pr view <n> -R <repo> --json mergeable,mergeStateStatus,reviewDecision,autoMergeRequest,reviewRequests,statusCheckRollup,headRefOid`.

| State | Meaning | Action |
| --- | --- | --- |
| `BEHIND` | Strict required checks: the head lacks the base tip | `gh pr update-branch <n> --rebase`, wait for the new run, re-request review (the push dismissed it) |
| `BLOCKED` / `REVIEW_REQUIRED` | A verdict is missing, not a check | `reviewRequests` names who owes it; a documents-only change waits on the operator alone |
| `CLEAN` + `APPROVED` + armed, still open | The arm is inert: a method the ruleset forbids, or an arm taken before the head's checks went green | Read `autoMergeRequest.mergeMethod` against `allowed_merge_methods`, then `gh pr merge <n> --disable-auto` and press `gh pr merge <n> --rebase`; exit 0 with `The merge strategy for main is set by the merge queue` is an enqueue — prove it with a `mergeQueue` entry |
| `UNKNOWN` | GitHub has not computed the merge | `git fetch origin <head-sha>` then `git merge-tree --write-tree origin/main <head-sha>`; exit 0 is clean |
| `gh pr checks` empty | The workflow never loaded, so nothing ran | `gh run list --commit <head-sha>`; see `references/ci-troubleshooting.md` |

- **Two green pull requests can still conflict with each other.** `git merge-tree --write-tree <head-a> <head-b>` merges both heads against their common ancestor: a non-zero exit lists the stages. Order the landings and name the one-line resolution in the reply; a rebase onto the first reveals the same conflict later, at a worse moment.
- **A body's "byte-identical at `<sha>`" proves nothing about the merge.** That sha is often a pull-request head that changed before it merged. Hash the head's file against the upstream `main` the check will compare with (`curl -s https://raw.githubusercontent.com/<org>/<repo>/main/<path> | sha256sum`) and compare with `git show <head>:<path> | sha256sum`; a stale copy lands and then fails its own new check.
- **`update-branch` can answer `Could not resolve head ref`.** The branch is gone while the pull request is open: `delete_branch_on_merge` fired under it, or a parallel session tidied it. The commit survives at `refs/pull/<n>/head` — `git fetch origin <head-sha>`, `git push origin <head-sha>:refs/heads/<branch>`, then update. Read `state,mergedAt` before touching the ref: a branch that vanished this way often means the pull request merged since your triage read, and recreating it then leaves a stray branch to delete.
- Report ready-but-unmerged separately from blocked: the operator reads "waiting on your press" and "cannot merge" as different work.

## 8. Stacked pull requests

A stack is several PRs where each base is the branch below it: one PR per version or per step, when the steps build on each other. Prefer the extension where stacks are enabled (`references/stacked-prs.md`); use the manual procedure below for fork-based work or repos without stacks.

- **Branch from the parent, not `main`:** `git checkout <parent> && git pull && git checkout -b <child>`. The child's commit holds only that step.
- **Open the PR against the parent** (`gh pr create --base <parent>`), never against `main`, so the diff a reviewer reads is the child's commit alone. The body's first line names the stack: `Stacked on #<parent> — merge bottom-up; GitHub retargets this as its base lands.`
- **Verify each PR shows only its own step:** `gh pr view <n> --json baseRefName,changedFiles,additions,deletions` must match the one commit you added. A child showing the parent's files was branched or based wrong.
- **A base can move under a child** — a review fix, or another agent committing to that branch. Then `git checkout <child> && git rebase <parent> && git push --force-with-lease` and re-check the diff. Rebase rather than merge while the parent is still an open branch; once it has landed, the squash case below applies.
- **Force-pushing a child dismisses its approvals.** Re-request from the reviewers whose verdict matters.
- **Merge bottom-up.** Each merge retargets the next PR to `main`; after each one, `git fetch` and confirm the next PR's `baseRefName` before merging. A child merged first lands the parent's changes too.
- **A squash-merged parent is a stranger to the child.** Its changes arrive on `main` as one commit sharing no SHA with the child's copies, so every shared line reports `CONFLICTING` with identical content. Merge `origin/main` into the child; do not rebase a branch reviewers have seen.
- **Never settle a whole conflicted file with `--ours` or `--theirs`.** The parent can gain review fixes after the child was cut, so the child is not a superset and a whole-file choice deletes them. Take the base version and re-apply only the child's step:

```bash
# The child's step alone, captured before the merge or from the commits
git diff <child-base> <child-tip> -- path/to/file > /tmp/step.patch
git merge origin/main                       # leaves the file as UU
git checkout --theirs -- path/to/file       # the base's version
git add path/to/file                        # --3way refuses a path still UU
git apply --3way /tmp/step.patch
git add path/to/file
```

Do this per file; for a test file it keeps the parent's added tests and adds only the child's. Prove it with `git diff --cached origin/main --stat`: only the child's step, no parent files, no deletions of the parent's additions. Then run the full gate on the merge tree and push.

- **`git checkout` refuses a branch "already used by worktree"** when a parallel worktree owns it, often another agent in the sandbox. Run `git worktree list`, `cd` there and continue; never `--force` the checkout or make a second copy.
