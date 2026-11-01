# GitHub Pull Request Workflow

The PR lifecycle: `gh` first, then the `git` + `curl` fallback for machines without `gh`.

## Setup

Detect the auth path once per session:

```bash
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  AUTH="gh"
else
  AUTH="git"
  # Ensure we have a token for API calls
  if [ -z "$GITHUB_TOKEN" ]; then
    if _hermes_env="${HERMES_HOME:-$HOME/.hermes}/.env"; [ -f "$_hermes_env" ] && grep -q "^GITHUB_TOKEN=" "$_hermes_env"; then
      GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$_hermes_env" | head -1 | cut -d= -f2 | tr -d '\n\r')
    elif grep -q "github.com" ~/.git-credentials 2>/dev/null; then
      GITHUB_TOKEN=$(uv run python "${HERMES_HOME:-$HOME/.hermes}/skills/github/github-auth/scripts/git-credential-token.py")
    fi
  fi
fi
echo "Using: $AUTH"
```

Extract `owner/repo` from the remote for the curl commands (works for HTTPS and SSH):

```bash
REMOTE_URL=$(git remote get-url origin)
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
```

## 1. Branch

Pure `git`, identical either way:

```bash
git fetch origin
git checkout main && git pull origin main
git checkout -b feat/add-user-authentication
```

Names: `feat/`, `fix/`, `refactor/`, `docs/`, `ci/` plus a description.

## 2. Commits

Stage explicit paths, never `.`, then commit:

```bash
git commit -m "feat: add JWT-based user authentication

- Add login/register endpoints
- Add User model with password hashing
- Add auth middleware for protected routes"
```

Format: `type(scope): short description`, body wrapped at 72. Types: `feat`, `fix`, `refactor`, `docs`, `test`, `ci`, `chore`, `perf`.

## 3. Push and open the PR

```bash
git push -u origin HEAD

gh pr create \
  --title "feat: add JWT-based user authentication" \
  --body "## Summary
- Adds login and register API endpoints

## Test Plan
- [ ] Unit tests pass

Closes #42"
```

Options: `--draft`, `--reviewer user1,user2`, `--label`, `--base`. With curl: `POST /repos/$OWNER/$REPO/pulls` carrying `title`, `body`, `head`, `base`; add `"draft": true` for a draft. The response holds the `number`.

**Never trust the review request to have landed.** PR creation can return a URL while the request behind it failed, leaving the PR open with nobody requested. Read it back and repair one login per call:

```bash
gh pr view <number> --repo <owner>/<repo> --json reviewRequests --jq '[.reviewRequests[].login]'
gh pr edit <number> --repo <owner>/<repo> --add-reviewer <login>
```

**A fork PR into a repo your token cannot write to can never land a review request or arm auto-merge.** `--add-reviewer` and `gh pr merge --auto` fail with `does not have the correct permissions to execute RequestReviewsByLogin` / `EnablePullRequestAutoMerge`, and `gh pr checks` reports only `no checks reported` because the base repo's workflows belong to the base repo. That is the state, not a retry: open the PR, confirm `mergeable`, and say in the answer that requesting the reviewers and arming the merge are the repository owner's steps. Do not call the PR armed.

**A follow-up to an unmerged fork PR goes on the same branch, not a stack.** A PR's base must exist in the base repository, and the first branch lives only in your fork — `--base <that-branch>` cannot be opened at all, and a second PR against `main` would carry the first change twice. Push the follow-up onto the same branch (`git merge --ff-only`), rewrite the body with `gh pr edit <n> --body-file` so one review reads as one change, and give each commit its own message.

**A rejected push mid-review means the branch moved under you.** `git fetch`, then `git rebase origin/<branch>` — never `--force` a branch someone has read. Read their commits before resolving: one may be the fix your change replaces, so the body says which commit it supersedes and why the new shape covers the same ground.

**The body carries the evidence, or there is nothing to review.** What changed, what was verified and with which command and result, and what was left out. "Tests pass" without the command is a claim, not a verification record — see `templates/pr-body-feature.md`.

## 4. CI status

```bash
gh pr checks
gh pr checks --watch   # polls every 10s
```

Read both endpoints of the head commit: `/commits/$SHA/status` (contexts) and `/commits/$SHA/check-runs`. Neither alone is the answer.

## 5. Fixing CI

1. `gh run list --branch $(git branch --show-current) --limit 5`
2. `gh run view <RUN_ID> --log-failed`
3. Fix with `read_file` + `patch`/`write_file`
4. `git add <fixed_files> && git commit -m "fix: ..." && git push`
5. Re-check CI
6. Repeat up to 3 attempts, then ask the user

Without `gh`, the logs endpoint returns a zip: `curl -s -L .../actions/runs/$RUN_ID/logs -o ~/.hermes/cache/scratch/ci-logs.zip`, then `unzip -o ci-logs.zip -d ci-logs`.

## 6. Merge

```bash
gh pr merge --squash --delete-branch
gh pr merge --auto --squash --delete-branch
```

Methods: `merge`, `squash`, `rebase`. Auto-merge requires the repo setting and is GraphQL only — REST has no endpoint: send `enablePullRequestAutoMerge` with the PR `node_id` and `mergeMethod: SQUASH`.

## 7. Is this PR actually mergeable?

Three reads, in this order.

### The repository's rules block it, not the colour of the checks

```bash
gh api repos/$OWNER/$REPO/rulesets --jq '.[] | "\(.id) \(.name)"'
gh api repos/$OWNER/$REPO/rulesets/<id> --jq '.rules[] | {type, parameters}'
gh pr view <N> --repo $OWNER/$REPO --json mergeStateStatus,mergeable,reviewDecision
```

A repo governed by rulesets returns 404 from `.../branches/main/protection` — that endpoint is classic branch protection only, so read the ruleset instead. `BLOCKED` with `reviewDecision: REVIEW_REQUIRED` and **no required status checks** means the red job is not what holds it: say "it needs one approval; the failing check is not required", not "CI is failing".

### A red check may be pre-existing, and saying so is honest

```bash
gh run view <run-id> --json headSha,conclusion   # is this run even on my commit?
gh run list --branch main --limit 5             # does main fail the same job?
```

Compare `headSha` with `git rev-parse --short HEAD` before quoting any run. A job red on the default branch is not this change's finding — report it as pre-existing with the run you compared, and **never silence it with a repo-wide formatter** (`prettier --write .` rewrites approval-gated files such as `AGENTS.md` without prompting). Run formatters on explicit paths.

### Feedback lives on three endpoints, and the loud one can be empty

| Where the words are | Read it with |
| --- | --- |
| Conversation comments on the PR | `gh pr view <N> --json comments` |
| A review's summary body | `gh pr view <N> --json reviews` |
| **Inline comments on a diff line** | `gh api repos/$OWNER/$REPO/pulls/<N>/comments --jq '.[] \| {path,line,body,user:.user.login}'` |

A review can read `CHANGES_REQUESTED` with an **empty body** and all of its content inline, where neither of the first two shows it. Check the third endpoint before reporting "no feedback".

### Quote the deployed preview, matched to the head commit

The build comment carries the preview URL (`https://<short-sha>.<project>.pages.dev`) plus a branch alias. Confirm the commit it was built from matches your head — a branch alias can serve an older deploy than the push you just made.

## Answering inline review threads

Reply where the ask was, so the reviewer sees it in the thread:

```bash
cat > /tmp/reply.json <<'JSON'
{"body": "Fixed — the rule now says `any page it keeps of its own`.", "in_reply_to": 1234567}
JSON
gh api repos/<owner>/<repo>/pulls/<N>/comments -X POST --input /tmp/reply.json
gh api repos/<owner>/<repo>/pulls/comments/<new-id> --jq .body   # read it back
```

`in_reply_to` goes **inside** the JSON: `--input` refuses to combine with `-f`/`-F`, so a command passing both posts nothing. A body built with `-f body="…"` is shell text first — a backtick pair is command substitution, so a reply naming `experiment-entry` posts the sentence with the identifier executed away.

**Only GraphQL resolves a thread** — REST has no endpoint for it:

```bash
gh api graphql -f query='query { repository(owner:"<owner>", name:"<repo>") { pullRequest(number:<N>) \
{ reviewThreads(first:20){ nodes { id isResolved comments(first:1){nodes{databaseId path}} } } } } }'
gh api graphql -f query='mutation($id:ID!){ resolveReviewThread(input:{threadId:$id}){thread{isResolved}} }' \
  -F id=<thread-id>
```

Resolve each thread once the answer is posted: an unresolved thread leaves the reviewer re-reading the same finding, and `reviewDecision` does not move until they answer again.

## Useful commands

| Action | gh | git + curl |
| --- | --- | --- |
| List my PRs | `gh pr list --author @me` | `curl -s -H "Authorization: token ***" "https://api.github.com/repos/$OWNER/$REPO/pulls?state=open"` |
| View PR diff | `gh pr diff` | `git diff main...HEAD` |
| Add comment | `gh pr comment N --body "..."` | `curl -X POST .../issues/N/comments -d '{"body":"..."}'` |
| Request review | `gh pr edit N --add-reviewer user` | `curl -X POST .../pulls/N/requested_reviewers -d '{"reviewers":["user"]}'` |
| Close PR | `gh pr close N` | `curl -X PATCH .../pulls/N -d '{"state":"closed"}'` |
| Check out someone's PR | `gh pr checkout N` | `git fetch origin pull/N/head:pr-N && git checkout pr-N` |
