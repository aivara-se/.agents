# GitHub Code Review

Review local changes before you push, or review a PR on GitHub. Most of this is plain `git`; the `gh`/`curl` split matters only for PR-level calls.

## Prerequisites

- Authenticated (read `references/auth.md`).
- Inside a git repository.

For the API calls, extract the owner and repo from the remote:

```bash
REMOTE_URL=$(git remote get-url origin)
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
```

## 1. Reviewing local changes (pre-push)

```bash
git diff --staged            # what would be committed
git diff main...HEAD         # what a PR would contain
git diff main...HEAD --name-only
git diff main...HEAD --stat
```

Read the scope first (`git diff main...HEAD --stat` and `git log main..HEAD --oneline`), then review file by file: the diff shows what changed, `read_file` shows the code around it. Then sweep for what a diff hides:

```bash
# Debug statements and unresolved markers
git diff main...HEAD | grep -n "print(\|console\.log\|TODO\|FIXME\|HACK\|XXX\|debugger"

# Large files accidentally staged
git diff main...HEAD --stat | sort -t'|' -k2 -rn | head -10

# Secrets or credential patterns
git diff main...HEAD | grep -in "password\|secret\|api_key\|token.*=\|private_key"

# Merge conflict markers
git diff main...HEAD | grep -n "<<<<<<\|>>>>>>\|======="
```

### Review output format

Four sections, worst first. Each finding names `file:line`, the defect, and the fix.

```
## Code Review Summary

### Critical
- **src/auth.py:45** — SQL injection: user input passed directly to query.
  Suggestion: Use parameterized queries.

### Warnings
- **src/models/user.py:23** — Password stored in plaintext. Use bcrypt or argon2.

### Suggestions
- **src/utils/helpers.py:8** — Duplicates logic in `src/core/utils.py:34`.

### Looks Good
- Clean separation of concerns in the middleware layer
```

## 2. Reviewing a PR

```bash
gh pr view 123
gh pr diff 123 --name-only
gh pr checkout 123
# without gh:
#   git fetch origin pull/123/head:pr-123
#   git checkout pr-123
```

The `pull/123/head` fetch works everywhere and leaves you a branch that `read_file`, `search_files` and the test runner can use.

### Comment and review

```bash
# General comment
gh pr comment 123 --body "Overall looks good, a few suggestions below."

# One inline comment — line is the line in the NEW file
HEAD_SHA=$(gh pr view 123 --json headRefOid --jq '.headRefOid')
gh api repos/$OWNER/$REPO/pulls/123/comments --method POST \
  -f body="This could be simplified with a list comprehension." \
  -f path="src/auth/login.py" -f commit_id="$HEAD_SHA" -f line=45 -f side="RIGHT"

# Formal verdict
gh pr review 123 --approve --body "LGTM!"
gh pr review 123 --request-changes --body "See inline comments."
gh pr review 123 --comment --body "Some suggestions, nothing blocking."
```

`side` is `RIGHT` for added lines and `LEFT` for deleted ones. Event values are `"APPROVE"`, `"REQUEST_CHANGES"`, `"COMMENT"`.

Without `gh`, one POST to `https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER/reviews` submits a whole review at once: `commit_id`, `event`, `body`, and a `comments` array of `{path, line, body}`. That is the only way to land several inline comments in one round instead of one call each.

## 3. Review checklist

- **Correctness** — does it do what it claims? Empty input, nulls, large data, concurrent access, error paths.
- **Security** — no hardcoded secrets, input validation, injection and traversal, auth checks.
- **Quality** — naming, no premature abstraction, no duplicated logic, one job per function.
- **Testing** — every new path tested, happy and error cases.
- **Performance** — N+1 queries, blocking calls on an async path.
- **Docs** — public APIs, "why" comments on non-obvious logic, README when behaviour changed.

## 4. Pre-push workflow

1. `git diff main...HEAD --stat` — scope.
2. `git diff main...HEAD` — the change.
3. `read_file` any changed file you need context for.
4. Apply the checklist.
5. Report in the four sections.
6. Offer to fix critical findings before the push.

## 5. PR review, end to end

1. **Set up** — `source "${HERMES_HOME:-$HOME/.hermes}/skills/github/github-auth/scripts/gh-env.sh"`, or the auth block in `references/auth.md`.
2. **Gather context** — `gh pr view 123`, `gh pr diff 123 --name-only`, `gh pr checks 123`.
3. **Check the PR out** — `gh pr checkout`, or the `pull/N/head` fetch above.
4. **Diff against the PR's own base.** Take the base from the PR, never from your local branch:

```bash
BASE=$(gh pr view $PR_NUMBER --json baseRefOid --jq '.baseRefOid')
git fetch origin "$BASE"

git diff "$BASE"...pr-$PR_NUMBER --stat     # scope
git diff "$BASE"...pr-$PR_NUMBER            # the change
git diff "$BASE"...pr-$PR_NUMBER -- path/to/file.py   # file-by-file
```

A local `main` that lags the PR base makes `git diff main...HEAD` include every commit the branch is merely built on, so the file set and line count come out an order of magnitude too large. Reconcile the body's size claim against `additions`/`deletions` from `gh pr view --json`, not against the hunk count. `gh pr diff $PR_NUMBER` is the same diff GitHub computes — use it to confirm the local one matches before you read.

5. **Run the gate** — `python -m pytest 2>&1 | tail -20`, `ruff check . 2>&1 | head -30`, or the project's equivalents.
6. **Apply the checklist.**
7. **Post the verdict** as a formal review with inline comments. Then add one summary comment so the author sees the whole picture at a glance — format in `references/review-output-template.md`.
8. **Clean up** — `git checkout main && git branch -D pr-$PR_NUMBER`.

### Verdict

- **Approve** — nothing critical or warning-level.
- **Request Changes** — any critical or warning-level issue that should land before merge.
- **Comment** — observations only, nothing blocking; use it when you are unsure or the PR is a draft.
