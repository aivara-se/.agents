---
name: dispatch
description: What to do when a Dispatch wake names an issue or a pull request — the read pass, an assignment, a review, a pull request, and an answer.
when-to-use: A wake from Dispatch arrives, the operator asks whether an `aivara-se` repository has open work, or you are about to open, push to or answer a pull request in one.
---

# Dispatch

A wake is a reason, not an instruction: it names one item and may arrive early, late, twice or out of order.

## The wake

- Kinds: `review requested`, `changes requested`, `issue assigned`, `pull request assigned`, `checks failed`, `mentioned`.
- `<repo>#<number>` is an issue or a pull request; `<repo>@<branch>` is a default branch that failed.
- A repeat or a late wake is answered by reading the item. Done means stop: never post twice.

## The read pass

1. Fetch first: `git fetch origin`, never one refspec. A clone is another session's snapshot, and `pull/<n>/head` leaves `origin/main` stale.
2. A second session may have answered, or be mid-fix here: read `origin/<branch>`, the thread, `git log -1` and the file mtimes before you edit.
3. Check `remote.origin.fetch`: a single-branch clone refreshes one branch, so fetch the other by name.
4. Read the diff `origin/main...<head>`, never `main...<head>`: a fetch moves no local branch.
5. Read the item whole: body, every comment, every review.
6. Read the diff at the head, and any open pull request on the same surface.
7. Read the entry file and documents at `origin/main`, not the working tree: a shared clone sits on an old branch.
8. Run the gate at the head you judge, and keep the command and its output.
9. Open the skill that owns the work: `coding`, `testing`, `writing`, `review`.

## Assigned to you

- The assignment is the claim. You own the outcome until it lands or you hand it back.
- An issue starts with its criteria, each testable and still true of the tree.
- A criterion that already holds on `origin/main` is finished: comment the commit that landed it, then close with `--reason completed`.
- A criterion that is missing or contradicted gets one comment naming whose decision it is, and no start.
- Blocked is a state you report, not route around. Comment the blocker and who it waits on.
- Branch from the default branch and open one pull request that closes it. `Closes #29, #30` closes only the first: repeat the keyword.
- A pull request assigned to you is owned the same way: never push to a branch another agent wrote.

## A branch with no pull request

- Diff it against its merge base, then run its gate and the checks it omits: `references/orphan-branch.md`.
- With a merge base it is a change with no body: run the gate and read the documents against each other. `review` owns the procedure.
- Read CI at the sha you judge: `gh run list --branch <b> --json headSha,conclusion`. A green run on another head proves nothing.
- A service branch is exercised, not only built: `references/exercising-the-engine.md`.

## A review requested

- Do not review from the page: check out the head, run the gate, exercise the claim. `review` owns the procedure.
- Read the whole diff before the first word. One review per head.
- Never push to a branch you review.

## Opening a pull request

- Branch, commit and push as the entry file requires, never on the default branch.
- The body follows `writing`. `coding` names the reviewers, `blogging` for a log entry.
- Read `reviewRequests` back: the create-time flag can report failure on a pull request that exists.
- Never a stacked one: `coding` names its merge.
- A merge queue holds the method and the arming rules: `references/merge-queue.md`. The press belongs to the merger.
- An author with nothing left says so on the thread.

## Answering a review or a comment

- `changes requested` is a work order inside the item's scope: fix each finding, or say on the thread why not.
- Silence is not an answer, and neither is "agreed".
- The scope is the item's. A finding that asks for more gets one line putting it out of scope, offered as a follow-up.
- Before you answer, read the item against the head. A missed original goal costs more than any finding.
- Push to the same branch. Never force-push over a review.
- After the push: correct the body, pair each finding with its commit, re-request, and read `reviewRequests` back.
- A reply is written in Simplified Technical English, per `writing`.
- A decision that is not yours is `block`, naming who decides.

## A discussion round

- One message per round, then stop: a second message is noise.
- A clause addressed to your handle is a work order. Do the work, then report the head and the link.
- Say only what the round has not: agreement is silence, and a repeated point costs a round.
- Read the item's state first: a pull request a teammate approved may already be merged, so fix it on a delta branch.
- End on the handle you want in the next round.

## When the operator asks whether there is work

An empty tracker is a finding: answer from the remote and sweep the boards and unlanded branches (`references/operator-work-check.md`).

## A failed check

Read the failing job's log, reproduce at the head, fix, push, re-request. Never retry for green: a test that passes on its second run is broken.

A check that never reports is not a red check: `references/failed-checks.md`.

## When the loop is capped

The service caps rounds and failed-check wakes, then wakes nobody. At the cap, say so: the decision is the operator's.
