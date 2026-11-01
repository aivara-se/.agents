# GitHub Code Review

Review local changes before pushing, or review an open PR. Most of this is plain `git`; the `gh`/`curl` split matters only for PR-level actions.

## Setup

Authenticate first — see `auth.md`. Then take `OWNER` and `REPO` from the remote:

```bash
REMOTE_URL=$(git remote get-url origin)
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
```

## 1. Local changes (pre-push)

Pure `git`, no API needed:

```bash
git diff --staged            # what would be committed
git diff main...HEAD         # what a PR would contain
git diff main...HEAD --stat  # insertions/deletions per file
git diff main...HEAD --name-only
```

Read the shape first, then file by file:

```bash
git diff main...HEAD --stat
git log main..HEAD --oneline
git diff main...HEAD -- src/auth/login.py
```

Grep the diff for what gets past a human eye:

```bash
# Debug statements and markers left behind
git diff main...HEAD | grep -n "print(\|console\.log\|TODO\|FIXME\|HACK\|XXX\|debugger"

# Large files accidentally staged
git diff main...HEAD --stat | sort -t'|' -k2 -rn | head -10

# Secrets and credential patterns
git diff main...HEAD | grep -in "password\|secret\|api_key\|token.*=\|private_key"

# Merge conflict markers
git diff main...HEAD | grep -n "<<<<<<\|>>>>>>\|======="
```

## 2. Review output

Report findings in this structure, each with `file:line` and a fix:

```
## Code Review Summary

### Critical
- **src/auth.py:45** — SQL injection: user input passed directly to query.
  Suggestion: Use parameterized queries.

### Warnings
- **src/models/user.py:23** — Password stored in plaintext. Use bcrypt or argon2.

### Suggestions
- **src/utils/helpers.py:8** — Duplicates logic in `src/core/utils.py:34`. Consolidate.

### Looks Good
- Clean separation of concerns in the middleware layer
```

## 3. Reviewing a PR

```bash
gh pr view 123
gh pr diff 123
gh pr diff 123 --name-only
```

Check it out to get `read_file`, `search_files` and the test suite on it:

```bash
git fetch origin pull/123/head:pr-123
git checkout pr-123
git diff main...pr-123
```

Then run the project's own checks before you form a verdict: `python -m pytest`, `npm test`, `cargo test`, `ruff check .`, `eslint`.

### Comment

```bash
gh pr comment 123 --body "Overall looks good, a few suggestions below."
```

Inline, on a diff line:

```bash
HEAD_SHA=$(gh pr view 123 --json headRefOid --jq '.headRefOid')

gh api repos/$OWNER/$REPO/pulls/123/comments \
  --method POST \
  -f body="This could be simplified with a list comprehension." \
  -f path="src/auth/login.py" \
  -f commit_id="$HEAD_SHA" \
  -f line=45 \
  -f side="RIGHT"
```

`line` is the line number in the **new** version of the file. For a deleted line use `"side": "LEFT"`.

### Formal review

```bash
gh pr review 123 --approve --body "LGTM!"
gh pr review 123 --request-changes --body "See inline comments."
gh pr review 123 --comment --body "Some suggestions, nothing blocking."
```

Many inline comments in one verdict: `POST /repos/$OWNER/$REPO/pulls/$PR_NUMBER/reviews` with `commit_id`, `event` (`APPROVE`, `REQUEST_CHANGES`, `COMMENT`) and a `comments` array of `{path, line, body}`.

Post a top-level summary as well, so the author gets the whole picture in one place — use `references/review-output-template.md`.

Then clean up: `git checkout main && git branch -D pr-123`.

### Reading the merge state

An `APPROVED` review in the reviews list does not mean the pull request is approved. Read the decision, the state and the ruleset together:

```bash
gh pr view 123 --json headRefOid,reviewDecision,mergeStateStatus,autoMergeRequest
gh api repos/$OWNER/$REPO/rules/branches/main \
  --jq '.[] | select(.type=="pull_request") | .parameters'
```

- `reviewDecision: REVIEW_REQUIRED` beside an approval: `require_last_push_approval` excludes the approval of whoever pushed last, and a rebase-merge into the branch counts as that user's push. The approver can approve again all day; someone else has to.
- `dismiss_stale_reviews_on_push` clears approvals on the next push but leaves a `CHANGES_REQUESTED` review standing, so the pull request stays blocked until that reviewer submits a fresh review or the review is dismissed. "Stale reviews" here means approvals.
- `autoMergeRequest` non-null with `mergeStateStatus: BLOCKED` is armed and waiting, not landing: taking the last block away merges it, so do not post an approving review without knowing which block that is.
- `headRefOid` can move between your read and your post. Fetch it again right before `gh pr review`, put it in the body, and if it changed, review the new head instead of posting a verdict on the old one.

## 4. What to check

- **Correctness** — the code does what the PR claims; empty, null, large and concurrent inputs handled; error paths handled.
- **Security** — no hardcoded secrets or keys; input validated; no SQL injection, XSS or path traversal; auth and authz checks where needed.
- **Quality** — clear names, no premature abstraction, no duplicated logic, one job per function.
- **Testing** — new paths tested, error cases included, tests readable.
- **Performance** — no N+1 queries, no blocking calls in async code, caching where it pays.
- **Documentation** — public APIs documented; "why" comments on non-obvious logic; README updated if behavior changed.

## 5. Verdict

- **Approve** — no critical or warning-level issue; suggestions only.
- **Request Changes** — any critical or warning-level issue that must be fixed before merge.
- **Comment** — observations, nothing blocking; use when unsure or the PR is a draft.
