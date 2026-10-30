# GitHub Pull Request Workflow

Complete guide for managing the PR lifecycle. Each section shows the `gh` way first, then the `git` + `curl` fallback for machines without `gh`.

## Prerequisites

- Authenticated with GitHub (see `github-auth` skill)
- Inside a git repository with a GitHub remote

### Quick Auth Detection

```bash
# Determine which method to use throughout this workflow
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

### Extracting Owner/Repo from the Git Remote

Many `curl` commands need `owner/repo`. Extract it from the git remote:

```bash
# Works for both HTTPS and SSH remote URLs
REMOTE_URL=$(git remote get-url origin)
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
echo "Owner: $OWNER, Repo: $REPO"
```

---

## 1. Branch Creation

This part is pure `git` — identical either way:

```bash
# Make sure you're up to date
git fetch origin
git checkout main && git pull origin main

# Create and switch to a new branch
git checkout -b feat/add-user-authentication
```

Branch naming conventions:
- `feat/description` — new features
- `fix/description` — bug fixes
- `refactor/description` — code restructuring
- `docs/description` — documentation
- `ci/description` — CI/CD changes

## 2. Making Commits

Use the agent's file tools (`write_file`, `patch`) to make changes, then commit:

```bash
# Stage specific files
git add src/auth.py src/models/user.py tests/test_auth.py

# Commit with a conventional commit message
git commit -m "feat: add JWT-based user authentication

- Add login/register endpoints
- Add User model with password hashing
- Add auth middleware for protected routes
- Add unit tests for auth flow"
```

Commit message format (Conventional Commits):
```
type(scope): short description

Longer explanation if needed. Wrap at 72 characters.
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `ci`, `chore`, `perf`

## 3. Pushing and Creating a PR

### Push the Branch (same either way)

```bash
git push -u origin HEAD
```

### Create the PR

**With gh:**

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

Options: `--draft`, `--reviewer user1,user2`, `--label "enhancement"`, `--base develop`

**Never trust the review request to have landed.** PR creation can return a URL while the reviewer request behind it fails (a GraphQL error at creation time leaves the PR open with nobody requested). Read it back and repair one login per call:

```bash
gh pr view <number> --repo <owner>/<repo> --json reviewRequests --jq '[.reviewRequests[].login]'
gh pr edit <number> --repo <owner>/<repo> --add-reviewer <login>
```

**A PR from a fork into a repo your token cannot write to can never land a review request or arm auto-merge.** Opening it succeeds, then `--add-reviewer` and `gh pr merge --auto` both fail with `does not have the correct permissions to execute RequestReviewsByLogin` / `EnablePullRequestAutoMerge`, and `gh pr checks` reports only `no checks reported` because the base repo's workflows belong to the base repo. That is the state, not a retry: open the PR, confirm `mergeable`, and report in the answer that requesting the reviewers and arming the merge are the repository owner's steps — do not describe the PR as armed.

**A follow-up to an unmerged fork PR goes on the same branch, not a stack.** A pull request's base must be a branch that exists in the base repository, and a review-then-redesign round on a fork PR leaves the first branch in your fork only — so `--base <that-branch>` cannot be opened at all, and a second PR against `main` would carry the first change a second time. Push the follow-up commits onto the same branch (`git merge --ff-only` from the work branch), and rewrite the PR body with `gh pr edit <n> --body-file` so the one review reads as one change — the body is the artifact, and a reviewer who sees the new shape described correctly in it does not need the old text. Give each commit its own message so the pieces stay readable in the history.

**A rejected push mid-review means the branch moved under you.** Another session or a reviewer can land
commits on the branch you are about to push to: `git fetch`, `git rebase origin/<branch>` — never `--force`
a branch someone has read — then read their commits before resolving. One of them may be the fix your change
replaces (a glyph redrawn, a sentence corrected); when so, the PR body says which commit it supersedes and
why the new shape covers the same ground, rather than dropping their work silently.

**The body carries the evidence, or there is nothing to review.** What changed, what was verified and with which command and result, and what was left out. A body that asserts "tests pass" without the command is a claim, not a verification record — see `templates/pr-body-feature.md`.

**With git + curl:**

```bash
BRANCH=$(git branch --show-current)

curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/$OWNER/$REPO/pulls \
  -d "{
    \"title\": \"feat: add JWT-based user authentication\",
    \"body\": \"## Summary\nAdds login and register API endpoints.\n\nCloses #42\",
    \"head\": \"$BRANCH\",
    \"base\": \"main\"
  }"
```

The response JSON includes the PR `number` — save it for later commands.

To create as a draft, add `"draft": true` to the JSON body.

## 4. Monitoring CI Status

### Check CI Status

**With gh:**

```bash
# One-shot check
gh pr checks

# Watch until all checks finish (polls every 10s)
gh pr checks --watch
```

**With git + curl:**

```bash
# Get the latest commit SHA on the current branch
SHA=$(git rev-parse HEAD)

# Query the combined status
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/commits/$SHA/status \
  | python -c "
import sys, json
data = json.load(sys.stdin)
print(f\"Overall: {data['state']}\")
for s in data.get('statuses', []):
    print(f\"  {s['context']}: {s['state']} - {s.get('description', '')}\")"

# Also check GitHub Actions check runs (separate endpoint)
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/commits/$SHA/check-runs \
  | python -c "
import sys, json
data = json.load(sys.stdin)
for cr in data.get('check_runs', []):
    print(f\"  {cr['name']}: {cr['status']} / {cr['conclusion'] or 'pending'}\")"
```

### Poll Until Complete (git + curl)

```bash
# Simple polling loop — check every 30 seconds, up to 10 minutes
SHA=$(git rev-parse HEAD)
for i in $(seq 1 20); do
  STATUS=$(curl -s \
    -H "Authorization: token $GITHUB_TOKEN" \
    https://api.github.com/repos/$OWNER/$REPO/commits/$SHA/status \
    | python -c "import sys,json; print(json.load(sys.stdin)['state'])")
  echo "Check $i: $STATUS"
  if [ "$STATUS" = "success" ] || [ "$STATUS" = "failure" ] || [ "$STATUS" = "error" ]; then
    break
  fi
  sleep 30
done
```

## 5. Auto-Fixing CI Failures

When CI fails, diagnose and fix. This loop works with either auth method.

### Step 1: Get Failure Details

**With gh:**

```bash
# List recent workflow runs on this branch
gh run list --branch $(git branch --show-current) --limit 5

# View failed logs
gh run view <RUN_ID> --log-failed
```

**With git + curl:**

```bash
BRANCH=$(git branch --show-current)

# List workflow runs on this branch
curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/actions/runs?branch=$BRANCH&per_page=5" \
  | python -c "
import sys, json
runs = json.load(sys.stdin)['workflow_runs']
for r in runs:
    print(f\"Run {r['id']}: {r['name']} - {r['conclusion'] or r['status']}\")"

# Get failed job logs (download as zip, extract, read)
RUN_ID=<run_id>
curl -s -L \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/actions/runs/$RUN_ID/logs \
  -o ~/.hermes/cache/scratch/ci-logs.zip
cd ~/.hermes/cache/scratch && unzip -o ci-logs.zip -d ci-logs && cat ci-logs/*.txt
```

### Step 2: Fix and Push

After identifying the issue, use file tools (`patch`, `write_file`) to fix it:

```bash
git add <fixed_files>
git commit -m "fix: resolve CI failure in <check_name>"
git push
```

### Step 3: Verify

Re-check CI status using the commands from Section 4 above.

### Auto-Fix Loop Pattern

When asked to auto-fix CI, follow this loop:

1. Check CI status → identify failures
2. Read failure logs → understand the error
3. Use `read_file` + `patch`/`write_file` → fix the code
4. `git add . && git commit -m "fix: ..." && git push`
5. Wait for CI → re-check status
6. Repeat if still failing (up to 3 attempts, then ask the user)

## 6. Merging

**With gh:**

```bash
# Squash merge + delete branch (cleanest for feature branches)
gh pr merge --squash --delete-branch

# Enable auto-merge (merges when all checks pass)
gh pr merge --auto --squash --delete-branch
```

**With git + curl:**

```bash
PR_NUMBER=<number>

# Merge the PR via API (squash)
curl -s -X PUT \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER/merge \
  -d "{
    \"merge_method\": \"squash\",
    \"commit_title\": \"feat: add user authentication (#$PR_NUMBER)\"
  }"

# Delete the remote branch after merge
BRANCH=$(git branch --show-current)
git push origin --delete $BRANCH

# Switch back to main locally
git checkout main && git pull origin main
git branch -d $BRANCH
```

Merge methods: `"merge"` (merge commit), `"squash"`, `"rebase"`

### Enable Auto-Merge (curl)

```bash
# Auto-merge requires the repo to have it enabled in settings.
# This uses the GraphQL API since REST doesn't support auto-merge.
PR_NODE_ID=$(curl -s \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER \
  | python -c "import sys,json; print(json.load(sys.stdin)['node_id'])")

curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/graphql \
  -d "{\"query\": \"mutation { enablePullRequestAutoMerge(input: {pullRequestId: \\\"$PR_NODE_ID\\\", mergeMethod: SQUASH}) { clientMutationId } }\"}"
```

## 7. Complete Workflow Example

```bash
# 1. Start from clean main
git checkout main && git pull origin main

# 2. Branch
git checkout -b fix/login-redirect-bug

# 3. (Agent makes code changes with file tools)

# 4. Commit
git add src/auth/login.py tests/test_login.py
git commit -m "fix: correct redirect URL after login

Preserves the ?next= parameter instead of always redirecting to /dashboard."

# 5. Push
git push -u origin HEAD

# 6. Create PR (picks gh or curl based on what's available)
# ... (see Section 3)

# 7. Monitor CI (see Section 4)

# 8. Merge when green (see Section 6)
```

## 8. Is this PR actually mergeable?

Three reads, in this order, before you answer "ready" — and each has burned a round of churn when skipped.

### What blocks the merge is the repository's rules, not the colour of the checks

```bash
gh api repos/$OWNER/$REPO/rulesets --jq '.[] | "\(.id) \(.name)"'
gh api repos/$OWNER/$REPO/rulesets/<id> --jq '.rules[] | {type, parameters}'
```

A repo governed by rulesets returns 404 from `.../branches/main/protection` (that endpoint is classic
branch protection only) — read the ruleset instead: required approvals, required status checks, linear
history. Then read the PR itself:

```bash
gh pr view <N> --repo $OWNER/$REPO --json mergeStateStatus,mergeable,reviewDecision
```

`BLOCKED` with `reviewDecision: REVIEW_REQUIRED` and **no required status checks** means the red job is not
what is holding it: say "it needs one approval; the failing check is not required", not "CI is failing".

### A red check may be pre-existing, and saying so is the honest answer

```bash
gh run view <run-id> --json headSha,conclusion   # is this run even on my commit?
gh run list --branch main --limit 5             # does main fail the same job?
```

Compare `headSha` with `git rev-parse --short HEAD` before quoting any run. When the same job is red on the
default branch it is not this change's finding — report it as pre-existing, with the run you compared, and
**never silence it with a repo-wide formatter** (`prettier --write .` rewrites approval-gated files such as
`AGENTS.md` without prompting). Run formatters on explicit paths.

### Feedback lives on three endpoints, and the loud one can be empty

| Where the words are | Read it with |
|---|---|
| Conversation comments on the PR | `gh pr view <N> --json comments` |
| A review's summary body | `gh pr view <N> --json reviews` |
| **Inline comments on a diff line** | `gh api repos/$OWNER/$REPO/pulls/<N>/comments --jq '.[] \| {path,line,body,user:.user.login}'` |

A review can read `CHANGES_REQUESTED` with an **empty body** and all of its content inline, where neither of
the first two shows it. Check the third endpoint before reporting "no feedback" or "the review is empty".

### Quote the deployed preview, and match it to the head commit

The build/deploy comment or check carries the preview URL (`https://<short-sha>.<project>.pages.dev`, plus a
branch alias that tracks the branch). Confirm the commit it was built from matches your head before you cite
it as evidence — a branch alias can be serving an older deploy than the push you just made.

## Answering inline review threads

Reply where the ask was, so the reviewer sees the answer in the thread:

```bash
cat > /tmp/reply.json <<'JSON'
{"body": "Fixed — the rule now says `any page it keeps of its own`.", "in_reply_to": 1234567}
JSON
gh api repos/<owner>/<repo>/pulls/<N>/comments -X POST --input /tmp/reply.json
gh api repos/<owner>/<repo>/pulls/comments/<new-id> --jq .body   # read it back
```

The reply target goes **inside** the JSON as `in_reply_to`: `--input` refuses to combine with `-f`/`-F`
fields, so a command that passes both posts nothing.

**A body built with `-f body="…"` is shell text first.** A backtick pair is command substitution, so a reply
that names `experiment-entry` posts the sentence with the identifier executed away. Write the JSON to a file
and pass `--input`; read the posted body back before trusting it.

**Only GraphQL resolves a thread** — REST has no endpoint for it:

```bash
gh api graphql -f query='query { repository(owner:"<owner>", name:"<repo>") { pullRequest(number:<N>) \
{ reviewThreads(first:20){ nodes { id isResolved comments(first:1){nodes{databaseId path}} } } } } }'
gh api graphql -f query='mutation($id:ID!){ resolveReviewThread(input:{threadId:$id}){thread{isResolved}} }' \
  -F id=<thread-id>
```

Resolve each thread once its answer is posted: an unresolved thread leaves the reviewer re-reading the same
finding, and `reviewDecision` does not move until they answer again.

## Useful PR Commands Reference

| Action | gh | git + curl |
|--------|-----|-----------|
| List my PRs | `gh pr list --author @me` | `curl -s -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/repos/$OWNER/$REPO/pulls?state=open"` |
| View PR diff | `gh pr diff` | `git diff main...HEAD` (local) or `curl -H "Accept: application/vnd.github.diff" ...` |
| Add comment | `gh pr comment N --body "..."` | `curl -X POST .../issues/N/comments -d '{"body":"..."}'` |
| Request review | `gh pr edit N --add-reviewer user` | `curl -X POST .../pulls/N/requested_reviewers -d '{"reviewers":["user"]}'` |
| Close PR | `gh pr close N` | `curl -X PATCH .../pulls/N -d '{"state":"closed"}'` |
| Check out someone's PR | `gh pr checkout N` | `git fetch origin pull/N/head:pr-N && git checkout pr-N` |
