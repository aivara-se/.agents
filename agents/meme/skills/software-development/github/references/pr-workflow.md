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

### Fold the attempts before the branch leaves the machine

The PR's history is part of the deliverable — the operator reads it as the story of the
change. A branch carrying its own attempts (a design the next commit replaces, or a `fix:`
that repairs the branch's own previous commit) reads as uncertainty, and gets sent back where
the project folds commits into clean changes.

- A repair that belongs to the commit above it: rebase with that commit's `pick` turned into
  `fixup`, non-interactively. `git rebase -i` runs `$GIT_SEQUENCE_EDITOR` with the todo file
  as its argument, so a script that seds one line does the work and no editor opens:

```bash
printf '#!/bin/sh\nsed -i "s/^pick <sha>/fixup <sha>/" "$1"\n' > ~/.hermes/cache/scratch/fold.sh
chmod +x ~/.hermes/cache/scratch/fold.sh
GIT_SEQUENCE_EDITOR=~/.hermes/cache/scratch/fold.sh git rebase -i <commit-before-the-pair>
```

- A chain of superseded attempts whose last commit already holds the shape you want:
  `git reset --soft HEAD~N`, then one commit describing the final shape. The intermediate
  designs never enter history, which is the point.

- **Prove the fold changed nothing else**: `git rev-parse HEAD^{tree}` must be identical
  before and after the rewrite. An unchanged hash means every measurement you took of the
  tree still holds — it is the one check that makes a history rewrite safe to push.

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

Options: `--draft`, `--reviewer user1,user2`, `--label "enhancement"`, `--base develop`.
For a body longer than a line, write it to a file and pass `--body-file <path>`, keeping that
file outside the Hermes home (`/root/pr-body.md`, not `~/.hermes/...`): the file tool refuses
any path under `~/.hermes`, the per-task mirror the sandbox will not write through (the
terminal can still write there — which is why the CI-log commands below use it). It is read
by a human the moment it lands, so re-read it before creating, state the gate you actually
ran with its real numbers, and flag anything noticed that belongs to another PR instead of
folding it into this one.

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

- **Read the workflow file before calling the branch green.** A repo's own check job often
  runs type check, formatting and build and never the test suite, so "checks passed" means
  the gate ran, not that the tests pass. Name the steps in your report.
- One row passing while the platform's analysis jobs (CodeQL and friends) are still pending
  is a partial, not a green. Report each check by name with its own state, and only call the
  branch clear when every row is.

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

## 6. Review on your own PR

A review that asks for changes blocks the merge. Read it in full before touching the branch: the summary says what is wrong, the inline notes carry the detail.

```bash
# The block, and who is holding it
gh pr view N --json state,reviewDecision,mergeStateStatus,reviews

# Inline review comments — no porcelain view covers these
gh api repos/{owner}/{repo}/pulls/N/comments -q '.[] | {author:.user.login,path,line,body}'
```

One row per inline note, `body` often a fenced `suggestion` block holding the replacement line. Apply them, comment on the PR saying so, then request the review again — re-requesting is what clears `CHANGES_REQUESTED`, so a fixed PR does not sit blocked behind a stale verdict:

```bash
gh pr comment N --body "Applied in <sha>: …"
gh pr edit N --remove-reviewer <user>
gh pr edit N --add-reviewer <user>
```

### Read the round before touching the branch

A round leaves comments in three places, and no single read shows all of them:

```bash
gh pr view N --json state,reviewDecision,headRefOid,reviews   # verdicts, oldest first
gh api repos/{owner}/{repo}/pulls/N/comments                  # inline notes, each with the commit it was left on
gh api repos/{owner}/{repo}/issues/N/comments                 # the conversation, and your own replies
```

- `reviews[]` is a log, not a state: every earlier request-changes and approval stays in it forever. Read the newest row per reviewer, and compare each row's `commit_id` with `headRefOid` — a verdict against an older commit answers code that no longer exists.
- A reviewer who withdraws a request for changes leaves both rows; the later one wins, and its body usually says what was withdrawn.
- A force-push (amend, rebase, `--force-with-lease`) dismisses every approval on the branch, which GitHub records as `DISMISSED`. Re-request review after the rewrite — a dismissed approval blocks nothing but approves nothing either.
- Fold the round's fixes into the branch's single commit before re-requesting: a follow-up `fix: address review` commit reads as a conversation rather than a change, and the tree hash check in *Fold the attempts* is what proves the fold lost nothing.

**Answer each inline note in its own thread** — a single top-level comment leaves the reader matching points to replies himself. The comment ids are not in any `pr view` output, so fetch them first (a note whose `line` shows as `outdated` still takes a reply):

```bash
gh api repos/$OWNER/$REPO/pulls/N/comments --jq '.[] | {id, path, line, body}'
gh api --method POST repos/$OWNER/$REPO/pulls/N/comments/<id>/replies -F body=@/abs/path/reply.md
```

- **Write the reply after the fix is pushed, never before.** A comment describing work that is not in the branch yet reads as done, and has to be deleted to unsay it; the push is what makes the sentence true. Draft the body into a file and re-read it before posting it (`-F body=@file`) — the thread is public the moment it lands.
- Name the commit that carries the fix and the numbers you re-verified; the operator reads the review round, not the diff.

- A suggestion is a line to apply, not a spec to reinterpret: land it as written, and keep any disagreement for a reply rather than silently improving it.
- A reviewer may not be addable — not everyone on the project is a collaborator. Report which names the request accepted instead of assuming both landed.
- When `--json` rejects a field with `Unknown JSON field`, the error lists what the endpoint does have. Read the list rather than guessing another field name.

## 7. Merging

Read the landing state in one call — `gh pr view N --json state,mergeable,reviewDecision`.
`MERGEABLE` says only that the branches do not conflict; branch protection can still hold the
PR at `REVIEW_REQUIRED`, and that is the state to report: ready, not landable until a review.

Match the method the base branch's history already uses: a linear base whose
commits carry the branch's own messages means **rebase** (`gh pr merge N
--rebase --delete-branch`); a base of `type: subject (#N)` rows means squash.
Read it with `git log --oneline --graph <base>` before choosing — a squash
flattens the story the branch took care to write, and a rebase rewrites every
SHA, so re-read the landed SHA before quoting one.

**An approval is not a merge.** `gh pr view N --json state,mergedAt` is the only
evidence a PR landed, whoever says otherwise — an approved PR sits open until
someone merges it. The merge is what starts the rest: read the run it triggers
(`gh run list --branch <base> -L 2`) and, where the change is published, the
address a user reaches it at (`curl -s -o /dev/null -w '%{http_code}' <url>`).
An Actions read can lag the run's real state — `queued`/`in_progress` on a run
that has already finished is a stale read, so re-query before reporting it
stuck.

**With gh:**

```bash
# Merge by the method the base's history uses, then delete the branch
gh pr merge N --rebase --delete-branch

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

## 8. Stacked pull requests

A stack is several pull requests where each one's base is the branch below it. Use it when
the operator asks for one PR per version or per step and the steps build on each other.
Prefer the official extension where stacks are enabled (`references/stacked-prs.md`): it
maintains the chain, pushes and merges atomically. Fall back to the manual procedure below
for fork-based work or repos where stacks are unavailable.

- **Branch from the parent branch, not `main`.** `git checkout <parent> && git pull && git
  checkout -b <child>`. The child's commit contains only that step.
- **Open the PR against the parent branch** (`gh pr create --base <parent>`), never against
  `main`; the diff a reviewer reads is then only the child's commit. The first line of the
  body names the stack: `Stacked on #<parent> — merge bottom-up; GitHub retargets this as its
  base lands.`
- **Verify each PR shows only its own step.** `gh pr view <n> --json
  baseRefName,changedFiles,additions,deletions` must match the single commit you added; a
  child showing the parent's files was branched or based on the wrong branch.
- **A base branch can move under a child.** When the parent gains a commit — a review fix, or
  another agent in the same sandbox committing to that branch — the child no longer contains
  the base's tip. `git checkout <child> && git rebase <parent> && git push --force-with-lease`,
  then re-check the child's diff. Rebase rather than a merge commit while the parent is still
  an open branch; once the parent has landed, the squash case below applies instead.
- **Force-pushing a child dismisses its approvals**, as on any branch; re-request review from
  the reviewers whose verdict matters.
- **Merge bottom-up.** Each merge retargets the next PR to `main`; after each one, `git fetch`
  and confirm the next PR's `baseRefName` before merging it. A child merged before its parent
  lands the parent's changes too.
- **A squash-merged parent is a stranger to the child.** After the parent lands, the child is
  retargeted to `main`, where the parent's changes arrive as one new commit that shares no SHA
  with the branch's own copies — so every line both sides touch reports `CONFLICTING`, even
  though the content is identical. Merge `origin/main` into the child (do not rebase a branch
  reviewers have seen).
- **Never settle a whole conflicted file with `git checkout --ours` or `--theirs`.** The parent
  can gain review fixes after the child was cut, so the child is not necessarily a superset and
  the whole-file choice silently deletes them — take the base version and re-apply only the
  child's own step instead:

```bash
# The child's step alone, captured before the merge or from the commits
git diff <child-base> <child-tip> -- path/to/file > /tmp/step.patch
git merge origin/main                       # leaves the file as UU
git checkout --theirs -- path/to/file       # the base's version
git add path/to/file                        # --3way refuses a path still UU
git apply --3way /tmp/step.patch
git add path/to/file
```

  Do this per conflicted file; for a test file it keeps the parent's added tests and adds only
  the child's. Prove the resolution before pushing: `git diff --cached origin/main --stat` must
  report only the child's own step — no parent files, no deletions of the parent's additions —
  then run the full gate on the merge tree and push.
- **`git checkout` refuses a branch "already used by worktree"** when a parallel worktree owns
  it — often another agent in the same sandbox. Run `git worktree list`, `cd` into that
  worktree, and continue there; never `--force` the checkout or make a second copy of the work.

## 9. Complete Workflow Example

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

# 8. Merge when green (see Section 7)
```

## Useful PR Commands Reference

| Action | gh | git + curl |
|--------|-----|-----------|
| List my PRs | `gh pr list --author @me` | `curl -s -H "Authorization: token $GITHUB_TOKEN" "https://api.github.com/repos/$OWNER/$REPO/pulls?state=open"` |
| View PR diff | `gh pr diff` | `git diff main...HEAD` (local) or `curl -H "Accept: application/vnd.github.diff" ...` |
| Add comment | `gh pr comment N --body "..."` | `curl -X POST .../issues/N/comments -d '{"body":"..."}'` |
| Request review | `gh pr edit N --add-reviewer user` | `curl -X POST .../pulls/N/requested_reviewers -d '{"reviewers":["user"]}'` |
| Close PR | `gh pr close N` | `curl -X PATCH .../pulls/N -d '{"state":"closed"}'` |
| Check out someone's PR | `gh pr checkout N` | `git fetch origin pull/N/head:pr-N && git checkout pr-N` |
