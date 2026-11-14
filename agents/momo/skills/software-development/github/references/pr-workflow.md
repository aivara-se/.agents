# GitHub Pull Request Workflow

The full PR lifecycle, `gh` first and `git` + `curl` as the fallback for machines without `gh`.

## Prerequisites

- Authenticated (read `references/auth.md`).
- Inside a git repository with a GitHub remote.

Pick the method once with the auth helper in `references/auth.md`, then extract owner and repo from the remote:

```bash
REMOTE_URL=$(git remote get-url origin)
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
```

## 1. Branch

```bash
git fetch origin
git checkout main && git pull origin main
git checkout -b feat/add-user-authentication
```

**Branch off the base, not off whatever the clone has checked out.** A shared clone accumulates branches that were pushed and then landed by squash or re-apply, so their content is already on `main`: branching from one gives an empty diff, or re-adds text `main` has since changed. Use `git fetch origin && git reset --hard origin/main && git checkout -b <branch>`. Before building on an existing branch, read `git log --oneline origin/main..HEAD` and `git diff --stat origin/main HEAD` — nothing ahead means the branch carries no work of its own.

Naming: `feat/`, `fix/`, `refactor/`, `docs/`, `ci/`, then a short description.

## 2. Commit

Make changes with `write_file` and `patch`, then:

```bash
git add src/auth.py src/models/user.py tests/test_auth.py

git commit -m "feat: add JWT-based user authentication

- Add login/register endpoints
- Add User model with password hashing
- Add auth middleware for protected routes
- Add unit tests for auth flow"
```

```
type(scope): short description

Longer explanation if needed. Wrap at 72 characters.
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `ci`, `chore`, `perf`.

## 3. Push and open a PR

```bash
git push -u origin HEAD
```

```bash
gh pr create \
  --title "feat: add JWT-based user authentication" \
  --body "## Summary
- Adds login and register API endpoints
- JWT token generation and validation

## Test Plan
- [ ] Unit tests pass

Closes #42"
```

Options: `--draft`, `--reviewer user1,user2`, `--label "enhancement"`, `--base develop`.

Without `gh`, POST to `/repos/$OWNER/$REPO/pulls` with `title`, `body`, `head` (the branch) and `base`; add `"draft": true` for a draft. The response JSON carries the PR `number` — keep it for the later calls.

## 4. Watch CI

```bash
gh pr checks
gh pr checks --watch      # polls every 10s until all checks finish
```

Without `gh`, two endpoints matter: `/commits/$SHA/status` (legacy commit statuses) and `/commits/$SHA/check-runs` (GitHub Actions). Query both — a green combined status can hide failing action runs.

## 5. Fix a CI failure

```bash
gh run list --branch $(git branch --show-current) --limit 5
gh run view <RUN_ID> --log-failed
```

Without `gh`, download the log zip:

```bash
curl -s -L \
  -H "Authorization: token ***" \
  https://api.github.com/repos/$OWNER/$REPO/actions/runs/$RUN_ID/logs \
  -o ~/.hermes/cache/scratch/ci-logs.zip
cd ~/.hermes/cache/scratch && unzip -o ci-logs.zip -d ci-logs && cat ci-logs/*.txt
```

Then fix with `patch` or `write_file`, commit, push, and re-check. Loop at most three times, then ask the user.

## 6. Merge

Read the branch's rules before the command: a required merge queue changes what `gh pr merge` means.

```sh
gh api repos/<owner>/<repo>/rulesets --jq '.[].id'
gh api repos/<owner>/<repo>/rulesets/<id> --jq '.rules[]|{type,parameters}'
```

The interesting rules: `merge_queue` (no strategy is allowed), `required_linear_history`, `required_status_checks.strict_required_status_checks_policy`, `dismiss_stale_reviews_on_push` (a rebase throws your approval away), `require_last_push_approval` (an approval older than the head does not count).

Before you lean on an approval, read the sha it carries, and compare it with the head:

```sh
gh api repos/<owner>/<repo>/pulls/<n>/reviews --jq '.[]|"\(.user.login) \(.state) \(.commit_id[0:8])"'
gh pr view <n> --json headRefOid --jq .headRefOid
```

Without a queue, pass the method the repository allows:

```bash
gh pr merge <n> --squash --delete-branch
gh pr merge <n> --auto --squash --delete-branch   # arms it until the checks pass
```

Merge methods: `"merge"` (merge commit), `"squash"`, `"rebase"`. Auto-merge must be enabled in the repository settings, and REST cannot set it — it is a GraphQL mutation (`enablePullRequestAutoMerge` with `mergeMethod: SQUASH`).

### A required merge queue

`gh pr merge <n>` with no strategy enqueues the pull request when the required checks have passed, and arms auto-merge when they have not. Two things make that look broken:

- A strategy flag prints `The merge strategy for main is set by the merge queue`, exits 0, and enqueues nothing. Read that line as a refusal, not as success.
- A pull request already armed with `SQUASH` auto-merge by another login swallows a bare `gh pr merge <n>` the same way: exit 0, no output, no entry. Read the queue after every press, and enqueue with the mutation below when the entry count did not move.
- `mergeStateStatus` is a racy read: `CLEAN`, then `UNKNOWN` while GitHub recomputes, then `MERGED`. Poll `state`; one sample proves nothing.

Read the queue, and enqueue directly when the porcelain did not take it:

```sh
gh api graphql -f query='query{repository(owner:"<owner>",name:"<repo>"){mergeQueue(branch:"<base>"){entries(first:10){nodes{position state pullRequest{number}}}}}}'
gh api repos/<owner>/<repo>/pulls/<n> --jq .node_id
gh api graphql -f query='mutation{enqueuePullRequest(input:{pullRequestId:"<node_id>"}){mergeQueueEntry{position state}}}'
```

`Pull request is already in the queue` answers a second attempt; that is the enqueue working. `autoMergeRequest` set by another login is not the queue: a pull request can sit armed and `CLEAN` with an empty queue.

The queue rebases each entry onto a temporary `merge_group` ref and lands it only when the required check passes there. A workflow that triggers on `pull_request` alone reports nothing for that ref, so the entry waits out the check timeout instead of merging — check the workflow's triggers before blaming the queue. Confirm the landing with `mergedAt` and the default branch's new head; state can read `OPEN` while the queue is still building.

Without `gh`, `PUT /repos/$OWNER/$REPO/pulls/$PR_NUMBER/merge` with `"merge_method": "squash"`, then `git push origin --delete $BRANCH` and `git checkout main && git pull origin main && git branch -d $BRANCH`.

## Useful commands

| Action | gh | git + curl |
| --- | --- | --- |
| List my PRs | `gh pr list --author @me` | `curl -s -H "Authorization: token ***" "https://api.github.com/repos/$OWNER/$REPO/pulls?state=open"` |
| View PR diff | `gh pr diff` | `git diff main...HEAD` (local) or `curl -H "Accept: application/vnd.github.diff" ...` |
| Add comment | `gh pr comment N --body "..."` | `curl -X POST .../issues/N/comments -d '{"body":"..."}'` |
| Request review | `gh pr edit N --add-reviewer user` | `curl -X POST .../pulls/N/requested_reviewers -d '{"reviewers":["user"]}'` |
| Close PR | `gh pr close N` | `curl -X PATCH .../pulls/N -d '{"state":"closed"}'` |
| Check out someone's PR | `gh pr checkout N` | `git fetch origin pull/N/head:pr-N && git checkout pr-N` |

### Reporting the open work

The operator asks for this repeatedly, so answer it from the repositories, not from search: `search/issues?q=org:<org> is:pr is:open` lags by minutes and misses a pull request opened in the same minute.

```sh
for r in $(gh repo list <org> --limit 100 --json nameWithOwner,isArchived --jq '.[]|select(.isArchived|not)|.nameWithOwner'); do
  gh pr list -R "$r" --state open --json number,title,isDraft,reviewDecision,mergeable,mergeStateStatus,reviewRequests,statusCheckRollup
done
```

Split on what still needs an action, and say what that action is: ready is `APPROVED` with `mergeStateStatus: CLEAN` and every rollup entry `SUCCESS`; blocked is `REVIEW_REQUIRED` (name the login in `reviewRequests`), `CHANGES_REQUESTED` (name the reviewer who holds it, including you), `CONFLICTING`/`DIRTY` (it needs a rebase first), or a draft. `mergeable: UNKNOWN` means GitHub has not recomputed yet — re-query before you call it blocked.

### When `gh pr edit` refuses

On a repository that still carries Projects (classic), `gh pr edit` aborts before writing — `GraphQL: Projects (classic) is being deprecated... (repository.pullRequest.projectCards)` — for both `--body-file` and `--add-reviewer`. The porcelain failed, not the permission: write through REST and read the field back.

```sh
gh api repos/<owner>/<repo>/pulls/<n> -X PATCH -F body=@/tmp/pr-body.md
gh api repos/<owner>/<repo>/pulls/<n>/requested_reviewers -X POST -f "reviewers[]=<login>"
gh api repos/<owner>/<repo>/pulls/<n>/requested_reviewers -X DELETE -f "reviewers[]=<login>"
gh pr view <n> --json body,reviewRequests   # read it back; the failed porcelain printed nothing
```
