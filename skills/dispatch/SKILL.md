---
name: dispatch
description: What to do when a Dispatch wake names an issue or a pull request — the read pass, an assignment, a review, a pull request, and an answer.
when-to-use: A wake from Dispatch arrives, the operator asks whether an `aivara-se` repository has open work, or you are about to open, push to or answer a pull request in one.
---

# Dispatch

A wake is a reason, not an instruction: it says why now and names one item, never what to do. It may arrive early, late, twice or out of order. Read the item, then decide.

## The wake

- `review requested`, `changes requested`, `issue assigned`, `pull request assigned`, `checks failed`, `mentioned`.
- `<repo>#<number>` is an issue or a pull request; `<repo>@<branch>` is a default branch that failed.

A repeat, or a wake that arrives after the state moved on, is answered by reading the item. If what it asks for is done, stop — never post twice because a second run started.

## The read pass

1. Fetch first: a clone is a snapshot, often shared with another session.
2. Read the item whole — body, every comment, every review.
3. Read the diff at the head, and any open pull request touching the same surface.
4. Read the repository's entry file, and its product, system and decision documents.
5. Run the gate at the head you are judging; keep the command and its output.
6. Open the skill that owns the work: `coding`, `testing`, `writing`, `review`.

## Assigned to you

- The assignment is the claim: you own the outcome until it lands or you hand it back in writing.
- An issue starts with its criteria, each testable and still true of the tree.
- A criterion that is missing or contradicted gets one comment naming whose decision it is, and no start.
- Blocked is a state you report, not route around: comment the blocker and who it waits on.
- Branch from the default branch, and open one pull request that closes it. `Closes #29, #30` closes only the first — repeat the keyword.
- A pull request assigned to you is owned the same way. You still never push to a branch another agent wrote.

## A review requested

- Do not review from the page: check out the head, run the gate, exercise the claim. `review` owns the procedure, `writing` the report.
- Read the whole diff before the first word, then submit once.
- One review per head. A second wake is a repeat.
- Never push to a branch you review.

## Opening a pull request

- Branch, commit and push as the entry file requires; never on the default branch.
- The body is `writing`'s `references/writing-pull-requests.md`; `coding` names the reviewers, `blogging` for a log entry.
- Read `reviewRequests` back: the create-time flag can report failure on a pull request that exists.
- Arm auto-merge on the head you pushed, at open time while checks still run.
- Arming later, once the head is approved and green, merges on the spot under your token.
- That press belongs to the merger: an author with nothing left but arming says so and lets it be armed.

## Answering a review or a comment

- `changes requested` is a work order inside the item's scope: fix each finding, or say on the thread why not, with evidence.
- Silence is not an answer, and neither is "agreed".
- The scope is the item's. A finding that asks for more gets the line that puts it out of scope, and the extra work is offered as a follow-up.
- Before you answer, read the item against the head: a missed original goal costs more than any finding.
- Push to the same branch. Never force-push over a review.
- After the push: correct the body, pair each finding with its commit, re-request, and read `reviewRequests` back.
- Answer where it was asked, and name the commit rather than "done".
- A decision that is not yours is `block`, naming who decides.

## When the operator asks whether there is work

An empty tracker is a finding: answer from the remote when asked, and sweep the boards and the unlanded branches — `references/operator-work-check.md`.

## A failed check

Read the failing job's log, reproduce at the head, fix, push, re-request. Never retry for green: a check that passes on the second run is a broken test.

## When the loop is capped

The service caps rounds and failed-check wakes per pull request, then wakes nobody. If the thread has reached it, say so on the thread: the decision is the operator's.
