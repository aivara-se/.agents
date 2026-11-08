# GitHub pull request workflow

The PR lifecycle, `gh` first. Authenticate with GitHub before you start (see the `github-auth` skill).

## 1. Branch and commit

```bash
git fetch origin
git checkout main && git pull origin main
git checkout -b feat/add-user-authentication
```

Prefixes: `feat/`, `fix/`, `refactor/`, `docs/`, `ci/`. Commit as `type(scope): short description`, wrapped at 72 characters. Types: `feat`, `fix`, `refactor`, `docs`, `test`, `ci`, `chore`, `perf`.

**Never amend a commit you did not write.** `git commit --amend --no-edit` keeps whatever `HEAD` is, so a commit another run landed between your edit and your commit becomes yours, under its message, and the push rewrites history nobody agreed to rewrite. Read `git log -1 --format='%h %s'` and amend only when that is your own commit; otherwise commit on top.

## 2. Open the PR

```bash
git push -u origin HEAD
gh pr create --title "feat: ..." --body "## Summary
- ...

## Test Plan
- [ ] Unit tests pass

Closes #42"
```

Options: `--draft`, `--reviewer user1,user2`, `--label`, `--base develop`.

Without `gh`, POST `/repos/$OWNER/$REPO/pulls` with `title`, `body`, `head`, `base` (`"draft": true` for a draft). The response carries the PR `number`.

## 3. Watch CI

```bash
gh pr checks            # one-shot
gh pr checks --watch    # polls every 10s
```

Without `gh`: commit status is `/commits/$SHA/status`, Actions check runs are `/commits/$SHA/check-runs` — they are separate endpoints, and reading one misses the other.

## 4. Fix failures

```bash
gh run list --branch $(git branch --show-current) --limit 5
gh run view <RUN_ID> --log-failed
```

Without `gh`, download `/actions/runs/$RUN_ID/logs` as a zip, unzip it, read the `.txt` files. Fix with `patch`/`write_file`, commit, push, re-check. Three attempts, then ask the user.

**A run named by the workflow's path failed to load.** `gh pr checks` prints `no checks reported`, `gh run list` shows the path instead of the workflow `name:`, and `gh run view` says _This run likely failed because of a workflow file issue_. The job never started, so there is no log to read: look for a `uses:` naming a reusable workflow, ref or action that is not on the default branch yet.

## 5. Merge

```bash
gh pr merge --squash --delete-branch
gh pr merge --auto --squash --delete-branch   # merges when all checks pass
```

**A repository enables one merge method and refuses the others.** `gh pr merge --squash` against a rebase-only repository fails with `Squash merges are not allowed on this repository. (mergePullRequest)` — the flag is a request, not a choice. Read the config:

```bash
gh api repos/O/R --jq '{squash:.allow_squash_merge, rebase:.allow_rebase_merge, merge:.allow_merge_commit}'
```

On a rebase-only repository **every commit the branch carries lands on the base as its own commit**, so a review-fix commit lands beside the original: squash or reword a messy branch before its first push, because a force-push after anyone has seen the branch is not available to you. On a squash-only repository the branch's commits are discarded for one new commit, so the message you wrote is not what lands.

No `gh`: PUT `/pulls/$PR/merge` with `merge_method` (`merge`, `squash`, `rebase`), then delete the remote branch. Auto-merge needs GraphQL — `enablePullRequestAutoMerge` with the PR `node_id` — and the setting enabled on the repository.

### Verifying merge state before you trust it

`mergeable` / `mergeStateStatus` come from GitHub's asynchronous computation and lag a push: a PR can read `CONFLICTING` while its current head merges cleanly. Pin the head first, then reproduce the merge yourself.

```bash
gh pr view <N> --json headRefOid,baseRefName,mergeable,mergeStateStatus,reviewDecision
git ls-remote origin refs/pull/<N>/head     # the head GitHub holds now
gh api repos/O/R/pulls/<N> --jq '{head:.head.sha, base:.base.sha, mergeable, state:.mergeable_state}'

# reproduce, in a clone of the remote (never a clone of a local checkout)
git clone https://github.com/O/R scratch && cd scratch
git fetch origin refs/pull/<N>/head:pr<N>
git merge --no-commit --no-ff pr<N>          # clean, or UU on named files
git diff --name-only --diff-filter=U         # the conflicted files
git merge --abort
```

- Read `mergeable` and `mergeStateStatus` together: `MERGEABLE` + `blocked` means the tree is fine and a review is the blocker.
- To sequence several open PRs, merge them one after another in the scratch clone and count the hunks (`grep -c '^<<<<<<<' <file>`). A pair can each be clean against the base and conflict with each other; only the second then needs a rebase, so land the unblocked one first.
- After an aborted merge test, `git checkout -- .` refuses on unmerged paths — use `git reset --hard <ref>` (plus `git clean -fd` for scratch files).

### After the merge, the local branch's hashes are dead

A squash or rebase merge rewrites the commits, so `main` does not carry your local branch's hashes and `git branch -d` refuses it as "not fully merged".

```bash
gh pr view <N> --json state,mergedAt   # MERGED + a real mergedAt before you believe it
gh pr view <N> --json commits          # what the branch held; not what main kept
git fetch --all --prune
git checkout main && git pull --ff-only
git branch -D <branch>                 # -D, not -d: the merge rewrote the commits
```

- `-D` is correct, not a workaround: after a rewrite there is no "fully merged" state for git to detect, so `-d` always refuses.
- `--json mergeCommit` is then the branch's top commit, not a two-parent merge commit — read `state`/`mergedAt` for whether it merged, never that field for how.
- The same applies when someone else merged your PR: pull `main`, then force-delete the local branch.

## 6. Other PR actions

| Action | gh | REST |
| --- | --- | --- |
| List my PRs | `gh pr list --author @me` | `GET /repos/$O/R/pulls?state=open` |
| Add comment | `gh pr comment N --body "..."` | `POST /issues/N/comments` |
| Request review | `gh pr edit N --add-reviewer user` | `POST /pulls/N/requested_reviewers` |
| Close | `gh pr close N` | `PATCH /pulls/N -d '{"state":"closed"}'` |
| Check out someone's PR | `gh pr checkout N` | `git fetch origin pull/N/head:pr-N` |
