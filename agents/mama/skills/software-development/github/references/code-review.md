# GitHub code review

Review local changes before pushing, or review open PRs on GitHub. Most of this works with plain `git`; the `gh`/`curl` split only matters for PR-level actions. Authenticate with GitHub first (see the `github-auth` skill); `owner/repo` extraction is in `pr-workflow.md`.

## 0. Scope gate (before any checklist)

A review answers one question: does this change do the task it claims, correctly? The task is the issue, the request or the operator's sentence, and its words are the contract. Quote the line a finding serves; a finding with no line is not a finding.

- **The checklist is a lens, not a second specification.** An item outside the contract — extra hardening, a refactor, a test for a case nobody reaches — is a comment or a follow-up issue, not a request for changes.
- **Blocking takes all five:** it is a defect, not a missing feature; a quoted task line requires it; the change's own lines cause it, or make an older defect reachable; the fix is smaller than the defect — no new abstraction, option, config key, file, dependency or document, with a test that pins the defect as the one allowed addition; and nobody named it in the body or thread already.
- **A named gap is the boundary.** If the body says what it leaves out, do not convert that into a finding.
- **Freeze the head and post once.** Read the whole diff, run it, list every finding, then post one review against the sha you name. A defect you missed at the first head is a follow-up at the next head, not a new blocking round — unless it loses data, crosses a security boundary, or leaves a gate green over broken behaviour.
- **Later rounds verify.** Round one finds; every round after checks the findings, the contract, and what the fix broke. A change still blocked after two rounds is the operator's call.
- **A void premise is a block.** When an operator decision or a merged change removed the problem, the change has no task: say so and name the operator.
- **The diff is the subject.** Merged code, adjacent modules and the backlog are a separate audit; their defects are follow-ups, never this verdict.

## 1. Local changes (pre-push)

```bash
git diff --staged            # what would be committed
git diff main...HEAD         # what a PR would contain
git diff main...HEAD --stat  # insertions/deletions per file
git log main..HEAD --oneline

# left-behind debug code, TODOs, secrets, conflict markers
git diff main...HEAD | grep -n "print(\|console\.log\|TODO\|FIXME\|HACK\|XXX\|debugger"
git diff main...HEAD | grep -in "password\|secret\|api_key\|token.*=\|private_key"
git diff main...HEAD | grep -n "<<<<<<\|>>>>>>\|======="
```

Read each changed file in full with `read_file`; a diff alone hides issues the surrounding code shows.

## 2. Review output format

In an `aivara-se` repository, the shared `review` skill outranks this section: the verdict first, then only the blocking findings, each at most three lines; no summary and no praise. This generic format is for a repository with no review skill of its own.

```
## Code Review Summary
### Critical
- **src/auth.py:45** — SQL injection: user input passed directly to query. Use parameterized queries.
### Warnings
- **src/models/user.py:23** — Password stored in plaintext.
### Suggestions
- **src/utils/helpers.py:8** — Duplicates logic in `src/core/utils.py:34`.
### Looks Good
- Clean separation of concerns in the middleware layer
```

## 3. Reading a PR

```bash
gh pr view 123
gh pr diff 123 --name-only
gh pr checks 123
git fetch origin pull/123/head:pr-123 && git checkout pr-123   # full tree, no gh needed
```

## 4. Comments

```bash
# top-level PR comment
gh pr comment 123 --body "..."

# one inline comment, anchored to the head sha
HEAD_SHA=$(gh pr view 123 --json headRefOid --jq '.headRefOid')
gh api repos/$OWNER/$REPO/pulls/123/comments --method POST \
  -f body="..." -f path="src/auth/login.py" -f commit_id="$HEAD_SHA" -f line=45 -f side="RIGHT"
```

`line` is the line number in the _new_ file; use `side="LEFT"` for a deleted line.

Fetch all three surfaces when answering a review: a formal review's body, its inline comments, and the PR conversation are separate objects, and reading one misses the rest.

```bash
PR=123

# formal reviews — state (APPROVED / CHANGES_REQUESTED / COMMENTED) and body
gh api repos/$OWNER/$REPO/pulls/$PR/reviews \
  --jq '.[] | {user:.user.login, state, body}'

# inline review comments — a reply carries in_reply_to_id, a top-level one does not
gh api repos/$OWNER/$REPO/pulls/$PR/comments \
  --jq '.[] | "\(.id) L\(.line) reply_to=\(.in_reply_to_id) \(.user.login): \(.body)"'

# PR conversation comments (the timeline) — a different endpoint from the review comments
gh api repos/$OWNER/$REPO/issues/$PR/comments --jq '.[] | "\(.user.login): \(.body)"'
```

Answer in the comment's own thread — only the replies endpoint threads; a POST to `.../comments` starts a new comment instead.

```bash
gh api repos/$OWNER/$REPO/pulls/$PR/comments/$COMMENT_ID/replies \
  -f body="Done — the rule is now ..."
```

- Anchor by hunk, not by line: `.line` can come back `null` once the diff moves, while `.original_line` and `.diff_hunk` still mark the spot.
- `gh pr view --json reviewRequests` drops a reviewer the moment they submit, so an empty list does not mean the request was withdrawn — read `.../reviews` for what they said.
- A change request does not clear itself when the fix is pushed. Ask again in the same step as the push: `gh api repos/$OWNER/$REPO/pulls/$PR/requested_reviewers -f reviewers[]=<login>`.
- **Fix the class, not the comment.** A reviewer strikes one line, and the fault is usually that line's shape repeated — the same assumption, the same missing case. Search the file or the diff for the shape and fix every instance in the same push; answering only the quoted line buys another round.
- **One push per round.** Make every fix, reply to each thread and re-request review in the same step, then update the PR body so it still says what the change does, what was verified and what was left out.

### When the branch is yours

A bare "check this PR" is not an order to review it. Read whose branch it is first: an author reviews their own answers themselves, and the finding that matters is the one already on the PR.

```bash
gh pr view $PR --repo $OWNER/$REPO --json author,reviewDecision,reviews \
  --jq '{author: .author.login, decision: .reviewDecision, reviews: [.reviews[] | {who: .author.login, state, body}]}'
```

- **Yours** — clear what is pending, and take each finding as a claim, not an instruction: run the command that shows it on the branch (`git ls-tree -r HEAD --name-only`, `gh pr checks`, the path it says is absent) before editing, and put that command and its output in the reply. A finding you cannot reproduce is answered with evidence, not obeyed.
- **Not yours** — review it (section 5).
- Part of a suggested fix is takeable. Where the reviewer names a change **and** an anchor you would not add (an issue number, a link), make the change and say in the reply why the anchor is left out.
- A review whose verdict is all in its body has no thread — `reviewThreads` returns empty — so answer it with `gh pr comment <n> --body-file <f>`, not the thread-replies endpoint.
- Update the body in the same push and re-request the reviewer; `reviewDecision` stays `CHANGES_REQUESTED` until they look again, so a fixed PR still reads as blocked.

## 5. Submitting a formal review

```bash
gh pr review 123 --approve --body "LGTM!"
gh pr review 123 --request-changes --body "See inline comments."
gh pr review 123 --comment --body "Some suggestions, nothing blocking."
```

Multi-comment review, submitted atomically:

```bash
HEAD_SHA=$(gh pr view 123 --json headRefOid --jq '.headRefOid')
gh api repos/$OWNER/$REPO/pulls/123/reviews --method POST -f commit_id="$HEAD_SHA" \
  -f event="REQUEST_CHANGES" -f body="..." \
  -f 'comments[][path]=src/auth.py' -f 'comments[][line]=45' -f 'comments[][body]=...'
```

Events: `APPROVE`, `REQUEST_CHANGES`, `COMMENT`.

### Let the formal review be the report

Do not post a second summary comment. The review body is the report: the verdict, then only the blocking findings, each with file, line, evidence and the smallest fix. A duplicate summary is noise the author reads twice and goes stale with the next push. If the workflow requires a top-level comment, keep it to one line naming the verdict and pointing at the review.

### Verdict

- **Approve** — you ran it, every task line holds, and no finding passes the gate.
- **Request changes** — the complete list of findings that pass the gate, each on a quoted task line.
- **Comment** — observations outside the task, including real ones; non-blocking, so they do not spend a round.

```bash
git checkout main && git branch -D pr-$PR_NUMBER   # clean up
```
