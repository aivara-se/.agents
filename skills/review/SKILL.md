---
name: review
description: How to review another agent's change — the contract it is held to, the checks that decide a verdict, and the loop.
when-to-use: A pull request or a task handoff is waiting on your review. Never your own work.
---

# Review

What to check, and which verdict each check earns. How the review reads is `writing`'s `references/writing-reviews.md`.

## The contract

1. Write the item's contract before the diff, in the item's own words. Name what it must do, must never do, and leaves out of scope.
2. Read the body and the thread: what was claimed, what the task asked, what the operator said there.
3. Read the diff twice, for what it does and for what the body says. The gap is a finding. Work it could have done instead is a follow-up.
4. Run it at the pinned sha (`headRefOid`), not the branch, in a clean tree.
5. Re-read the head before you post: a review attaches to the head that exists then.
6. Test the claim: the empty input, the bug reproduced on the parent, the new test failing with the fix removed.
7. Look at what checks cannot see in the lines it wrote or made false: swallowed errors, a widened surface, a new dependency, a credential.
8. Read the prose: a sentence over the limit gets a comment, not a block.

A branch with no pull request has no `headRefOid`. Pin `origin/<branch>` and re-read it before the verdict: a force-push moves it, and a stale worktree runs the gate on the old tree.

A UI mock is held to the same standard, against the product's behaviour and the design's tokens: `references/reviewing-a-mock.md`.

A documents-only item — a plan, a spec, a design — is held to the other documents and the standard, not only the gate: `references/reviewing-documents.md`.

Read the matching reference before the first pass.

A line the item does not carry is not a contract line. Unchanged code is not this change's — but a line the change makes false is.

Grep the repository for the claim, not only the diff: one fact lives in several files. Zero hits for a path the diff stops naming mean the change dropped its last pointer.

Test a decision record against its sources, never against the decision you would have made: `writing` owns the record's own rules.

## Before you request changes

- The premise still stands. If an operator decision or a merged change removed it, the verdict is `block`.
- It is true. You reproduced it, with the command and its output, in the reply as much as in the body.
- A check is vacuous only when its log shows nothing ran. An inference from the file tree is not a log.
- It is the change's to fix. Name the contract line it misses or breaks. Work the item never asked for is an issue.
- It is a correction, not an addition: no new field, file, abstraction or gate. A fix that grows the change needs a criterion.
- A check can come from a default-setup scan (CodeQL) that no workflow file owns: read `gh run list --branch <default>`.
- The title obeys `writing`. Name the replacement when a formula opener hides it.

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
- A defect the first round missed in the same diff is still this change's: correct it before the merge, not after.
- A reasoned refusal is an answer. Weigh it, and approve when it holds.
- Hand a point back once, with `gh pr edit <n> --add-reviewer <login>`.
- Still apart? The operator decides.

## Where it goes

Post it as a formal review, the findings as its body, from a file with `--body-file`:

```sh
gh pr review <n> --request-changes --body-file <path>   # or --approve
```

Post a `block` with `--comment`: it is not a work order. An earlier `CHANGES_REQUESTED` still blocks the merge.

Read your own earlier reviews first. At an unmoved head a second is noise. At a moved head, diff the old sha to the new one, list each earlier finding fixed or open, and name what the fix broke.

## Landing it

When the task is to merge as well as review, the press is part of the work and has its own rules: `references/landing-a-review.md`.

## What a review is not

- Not style the formatter enforces.
- Not a sweep: a false line is fixed where it is false, and a nearby inconsistency is its own issue.
- Not a redesign or a scope increase.
- Not a security pass over merged code. That is a separate audit.
