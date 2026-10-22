---
name: dispatch
description: What to do when a Dispatch wake names an issue or a pull request — the read pass, an assignment, a review request, opening a pull request, and answering a review.
when-to-use: A wake from Dispatch arrives, or you are about to open, push to, or answer a pull request in an `aivara-se` repository.
---

# Dispatch

A wake is a reason, not an instruction. The sentence says why now and names one repository and one number; it never says what to do, and it may arrive early, late, twice, or out of order. The item is the record: read it, then decide.

## The wake

- `review requested` — you are on the pull request as a reviewer.
- `changes requested` — you are its author; a review asked for work.
- `issue assigned`, `pull request assigned` — you own it.
- `checks failed` — you pushed the head that failed.
- `mentioned` — someone named you in a comment and wants an answer there.
- `<repository>#<number>` is an issue or a pull request; `<repository>@<branch>` is a default branch that failed with no pull request to point at.

A repeat, or a wake that arrives after the state has moved on, is answered by reading the item: if what it asks for is already done, stop. Never post a second review or a second comment because a second run started. Do not answer the wake text and do not treat the service as a correspondent — it wakes nobody back; the thread is where you speak.

## The read pass

1. **Fetch first.** A clone is a snapshot and is often shared with another session; switch to the remote head before you read a file or trust a branch name.
2. **Read the item whole** — body, every comment, every review, not the newest alone. A thread that has moved since your last look is the normal case, not the exception.
3. **Read the diff at the head**, not the body's summary of it, and check the open pull requests that touch the same surface: the collision is a second change to one file, not a bad idea.
4. **Read the repository's entry file** for its gate, its house rules and its review targets, and its product, system and decision documents for what this change is judged against.
5. **Run the gate at the head you are judging**, and keep the command and its output for the answer.
6. **Open the skill that owns the work:** `coding` before writing the change, `testing` before claiming it works, `writing` for anything a reader consumes, `review` for a verdict.

## An issue or a pull request assigned to you

- The assignment is the whole claim: you own the outcome until it lands, or until you hand it back in writing. Nobody else is working it.
- An issue starts with its criteria. Each one must be testable and still true of the tree; when one is missing, ambiguous or already contradicted by a decision, say so in one comment on the issue, name whose decision it is, and do not start. Do not pick a reading in silence.
- Blocked is a state you report, not one you work around: comment with the specific blocker and who it waits on, and leave the item open. Unassigning wakes nobody, so say who it goes to on the thread.
- Then branch from the default branch, do the work, and open one pull request that closes it. `Closes #29, #30` closes only the first — repeat the keyword for each issue.
- A pull request assigned to you is owned the same way: its body true, its findings answered, its checks green, its merge reached. You still never push to a branch another agent wrote — the author applies every change; that only changes when you are the author.

## A review requested

- Do not review from the page. Check out the head, run the gate, and exercise the claim; the procedure, the verdict and the report shape are `review`.
- Read the whole diff before the first word of the review, then submit once. Findings posted while you are still reading are noise the author has to disprove twice.
- One review per head: if your review on this head already stands, the wake is a repeat — stop.
- You never push to the branch you review. `request changes` is the entire handoff; the author applies it.

## Opening a pull request

- Branch, commit and push as the repository's own version-control rules require; never on the default branch, never a force-push to a branch someone has seen.
- The body says what changed, what was verified and how — command and tree — what was left out, and the issue it closes. It does not walk the diff.
- Ask the reviewers the repository's entry file names: the operator and one peer for an implementation change; the operator alone for a documents-only one.
- Read `reviewRequests` back after creating it. The create-time flag can report failure on a pull request that exists; `gh pr edit <n> --add-reviewer <login>` fixes it.
- Arm auto-merge on the head you pushed. The approving review is then the act that lands the change, not a step before someone clicks merge.

## Answering a review or a comment

- `changes requested` is a work order. Fix each finding, or say on the thread why you will not — with the evidence — and leave the decision to the reviewer. Silence is not an answer, and neither is "agreed" with no change.
- Push new commits to the same branch. Never rewrite a branch that has been reviewed, and never force-push over the review that asked for the work.
- After the push: correct the body so it still describes the head, post one comment pairing each finding with the commit that settled it, re-request review from the same people, and read `reviewRequests` back. A push empties that list and drops approvals that covered the old head.
- Answer a comment where it was made. A mention is a summons, and the reply belongs in that thread rather than in chat or on another pull request.
- "Done" alone is not an answer: name the commit and what it changed. Do not resolve another agent's thread, and do not call a finding addressed without the change behind it.
- A decision that is not yours — product, access, an external service — is `block`, naming who must decide. Do not settle it by writing the code that assumes an answer.

## A failed check

You are woken as the pusher. Read the failing job's log, not the red mark; reproduce it at the head; fix it; push; re-request. Never retry for green: a check that passes on the second run is a broken test, and fixing it is part of the change.

## When the loop is capped

Ten rounds of change requests and five failed-check wakes per pull request, after which the service wakes nobody. If the thread has reached either, say on it that the loop is capped and the decision is the operator's. Do not keep working a thread that can no longer reach the person you are writing for.
