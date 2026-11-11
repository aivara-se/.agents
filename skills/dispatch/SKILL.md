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

A repeat, or a wake that arrives after the state moved on, is answered by reading the item. If it is done, stop: never post twice because a second run started.

## The read pass

1. Fetch first: `git fetch origin`, never a single refspec. A clone is another session's snapshot, and `pull/<n>/head` leaves `origin/main` stale enough to invent commits.
2. Read the diff `origin/main...<head>`, never `main...<head>`: a fetch moves no local branch.
3. Read the item whole: body, every comment, every review.
4. Read the diff at the head, and any open pull request touching the same surface.
5. Read the entry file and the product, system and decision documents at `origin/main`, not the working tree: a shared clone sits on a month-old branch.
6. Run the gate at the head you are judging, and keep the command and its output.
7. Open the skill that owns the work: `coding`, `testing`, `writing`, `review`.

## Assigned to you

- The assignment is the claim. You own the outcome until it lands or you hand it back in writing.
- An issue starts with its criteria, each testable and still true of the tree.
- A criterion that already holds on `origin/main` is a finished item: comment the commit that landed it, then close with `--reason completed`.
- A criterion that is missing or contradicted gets one comment naming whose decision it is, and no start.
- Blocked is a state you report, not route around. Comment the blocker and who it waits on.
- Branch from the default branch and open one pull request that closes it. `Closes #29, #30` closes only the first: repeat the keyword.
- A pull request assigned to you is owned the same way; never push to a branch another agent wrote.

## A review requested

- Do not review from the page. Check out the head, run the gate, exercise the claim. `review` owns the procedure and `writing` the report.
- Read the whole diff before the first word. One review per head.
- Never push to a branch you review.

## Opening a pull request

- Branch, commit and push as the entry file requires, never on the default branch.
- The body follows `writing`. `coding` names the reviewers, `blogging` for a log entry.
- Read `reviewRequests` back: the create-time flag can report failure on a pull request that exists.
- Never a stacked one: `coding` names its merge.
- Arm the final head: a later push can leave the arm inert and the head `CLEAN`, unqueued. Arming an approved, green head merges on the spot.
- On a merge queue, no strategy: `gh pr merge <n>` queues the head once checks pass.
- A required check that cannot load merges on nothing, armed or not. Name the missing file in the body, and arm once it lands.
- That press belongs to the merger. An author with nothing left says so on the thread.

## Answering a review or a comment

- `changes requested` is a work order inside the item's scope. Fix each finding, or say on the thread why not, with evidence.
- Silence is not an answer, and neither is "agreed".
- The scope is the item's. A finding that asks for more gets one line putting it out of scope; offer the work as a follow-up.
- Before you answer, read the item against the head. A missed original goal costs more than any finding.
- Push to the same branch. Never force-push over a review.
- After the push: correct the body, pair each finding with its commit, re-request, and read `reviewRequests` back.
- A reply is written in Simplified Technical English, per `writing`.
- A decision that is not yours is `block`, naming who decides.

## When the operator asks whether there is work

An empty tracker is a finding. Answer from the remote, and sweep the boards and the unlanded branches: `references/operator-work-check.md`.

## A failed check

Read the failing job's log, reproduce at the head, fix, push, re-request. Never retry for green: a check that passes on the second run is a broken test.

A check that never reports is not a red check. An empty `statusCheckRollup` means no run was created: the workflow failed to load, usually a `uses:` naming a reusable workflow absent at its pinned ref. The tell is a run named by its file path, with no log. Fix the file, then re-run on the same head: a re-run keeps the approval.

## When the loop is capped

The service caps rounds and failed-check wakes per pull request, then wakes nobody. At the cap, say so: the decision is the operator's.
