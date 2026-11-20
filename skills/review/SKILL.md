---
name: review
description: How to review another agent's change — the contract it is held to, the checks that decide a verdict, and the loop.
when-to-use: A pull request or a task handoff is waiting on your review. Never your own work.
---

# Review

What to check, and which verdict each check earns. Read a reference the check names before the first pass; how the review reads is `writing`'s `references/writing-reviews.md`.

## The contract

1. Write the contract before the diff, in the item's own words: what it must do, never do, and leave out of scope.
2. Read the body and the thread: what was claimed, what the task asked, what the operator said there.
3. Read the diff twice, for what it does and what the body says. The gap is a finding; other work it could have done is a follow-up.
4. Run it at the pinned sha (`headRefOid`), not the branch, in a clean tree.
5. Re-read the head before you post: a review attaches to the head that exists then.
6. Test the claim: empty input, the bug on the parent, the new test failing with the fix removed. A stub that never fails hides a branch.
7. Look at what checks cannot see: swallowed errors, a reason written and overwritten, a widened surface, a new dependency, a credential.
8. Read the prose: a sentence over the limit gets a comment, not a block.

A branch with no pull request has no `headRefOid`. Pin `origin/<branch>` and re-read it before the verdict: a force-push moves it, and a stale worktree gates the old tree. Check the pinned sha out detached in your own worktree, and reuse one already there. The shared clone may sit on another branch; a leftover directory makes `git worktree add` refuse.

A UI mock is held to the same standard, against the product's behaviour and the design's tokens: `references/reviewing-a-mock.md`.

A documents-only item (a plan, a spec, a design) is held to the other documents and the standard. Diff its branch as a tree: `references/reviewing-documents.md`.

A change that serves requests (a binary, a socket, a webhook) is probed on its surfaces, not only its tests: `references/probing-a-service.md`.

A row that ends in a new state needs a guard on the state it left. A row kept to apply later needs every field the apply branches on: `references/reviewing-a-state-transition.md`.

A finding passes `references/requesting-changes.md` before it is posted. Read the matching reference before the first pass.

A line the item does not carry is not a contract line. Unchanged code is not this change's, but a line the change makes false is. A body claim the diff does not cover still gets a reproduction, reported as an issue, not a blocking finding.

Grep the repository for the claim, not only the diff: one fact lives in several files. Zero hits for a path the diff stops naming mean the change dropped its last pointer.

Test a decision record against its sources, never against the decision you would have made: `writing` owns the record's own rules.

## The verdict

Return exactly one:

- `approve` — you ran it, every criterion the item names holds, and nothing else blocks.
- `request changes` — every blocking finding, each on a named contract line.
- `block` — the decision is not yours. Say who decides, or name the mechanism the item never authorized.

An approval can be the merge, so read `mergeStateStatus`, `statusCheckRollup` and `autoMergeRequest` first. Never approve your own branch.

An approval is one commit's, and a force-push can drop that commit: re-read `headRefOid` after you post, and review the head that replaced it.

A branch you rebased is a branch you pushed: under `require_last_push_approval` your approval stops counting, and re-approving clears nothing. Let the author rebase, or get another login's approval.

## The loop

- Rounds converge. The first finds; the second verifies the findings and what the fix broke. A new subject in round two is an issue, a third the operator's.
- Read your own earlier reviews first. At an unmoved head a second is noise.
- At a moved head, diff the old sha to the new one, list each finding fixed or open, and name what the fix broke.
- A proposed follow-up gets the proof the diff got: apply it, rerun, read back every row it names. A guard on one writer of two is not a fix.
- Applying a reviewer's fix ends with one sentence: which guard the invariant rests on. A clause no mutation can redden is redundant.
- A defect the first round missed is still this change's: correct it before the merge.
- When the merge beats you, do not reopen: cut a branch from `origin/<base>`, cherry-pick, and open the delta PR.
- A push that leaves `headRefOid` unmoved is a merged item: read `state` from `gh api`.
- A reasoned refusal is an answer. Weigh it, and approve when it holds.
- Hand a point back once, with `gh pr edit <n> --add-reviewer <login>`.
- Still apart? The operator decides.

## Where it goes

Post it as a formal review, the findings as its body, from a file with `--body-file`: `gh pr review <n> --request-changes --body-file <path>`. A `block` goes as `--comment`, and an earlier `CHANGES_REQUESTED` still blocks the merge. Landing: `references/landing-a-review.md`.

## What a review is not

- Not style the formatter enforces.
- Not a sweep: a false line is fixed where it is false, and a nearby inconsistency is its own issue.
- Not a redesign or a scope increase.
- Not a security pass over merged code. That is a separate audit.
