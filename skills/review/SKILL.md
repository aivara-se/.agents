---
name: review
description: How to review another agent's change — the contract it is held to, the checks that decide a verdict, and the loop.
when-to-use: A pull request or a task handoff is waiting on your review. Never your own work.
---

# Review

What to check, and which verdict each check earns. How the review reads is `writing`'s `references/writing-reviews.md`.

## The contract

1. Write the item's contract before the diff, in the item's own words. Name what it must do, what it must never do, and what it calls out of scope.
2. Read the body and the thread: what was claimed, what the task asked, what the operator said there.
3. Read the diff twice, for what it does and for what the body says. The gap is a finding. Work it could have done instead is a follow-up.
4. Run it at the pinned sha (`headRefOid`), not the branch: a rebase moves the head under you. Run the gate in a clean tree.
5. Re-read `headRefOid` before you post. A review attaches to the head that exists then, not the one you named.
6. Test the claim: the empty input, the bug reproduced on the parent, the new test failing with the fix removed.
7. Look at what checks cannot see in the lines it wrote or made false: swallowed errors, a widened surface, a new dependency, a credential.
8. Read the prose: a sentence over the limit gets a comment, not a block.

A line the item does not carry is not a contract line. Unchanged code is not this change's — but a line the change makes false is.

Grep the repository for the claim, not only the diff. One fact lives in several files, so a change that corrects one copy leaves the others false. Zero hits for a path the diff stops naming mean the change dropped its last pointer.

Test a decision record against its sources and itself, never against the decision you would have made. An accepted ADR is immutable: a change overrides it with a new ADR naming the clauses it replaces. Only the operator can sanction an edit in place.

## Before you request changes

- The premise still stands. If an operator decision or a merged change removed it, the verdict is `block`.
- It is true. You reproduced it, with the command and its output.
- It is the change's to fix. Name the contract line it misses or breaks. Work the item never asked for is an issue.
- It is a correction, not an addition: no new field, file, abstraction or gate. A fix that grows the change needs a criterion.
- A check can come from a default-setup scan (CodeQL) that no workflow file owns: read `gh run list --branch <default>`.
- The title obeys `writing`: under ten words, the component named, the verb first. Name the replacement when a formula opener hides it.

## The verdict

Return exactly one:

- `approve` — you ran it, every criterion the item names holds, and nothing else blocks.
- `request changes` — every blocking finding, each on a named contract line.
- `block` — the decision is not yours. Say who decides, or name the mechanism the item never authorized.

Never approve what you did not run, or your own branch. An approval can be the merge, so read `mergeStateStatus`, `statusCheckRollup` and `autoMergeRequest` first.

An approval is one commit's, and a force-push can drop that commit: re-read `headRefOid` after you post, and review the head that replaced it.

A branch you rebased is a branch you pushed: under `require_last_push_approval` your approval stops counting. The head reads `REVIEW_REQUIRED` with your `APPROVED` review listed, and re-approving clears nothing. Let the author rebase, or get another login's approval.

Two pull requests on one file merge as one, not two: the first landing makes the second `CONFLICTING`. Order them by their diffs, the small insert first, and re-read `mergeable` after each lands. A resolved conflict keeps both sides apart: git holds the shared opening line above the markers. The second side arrives without its own, so pasting the two together splices them into one object. Count the entries and read the seam; a file that parses need not hold both changes.

## The loop

- Rounds converge. The first finds, the second verifies the findings and what the fix broke. A subject new in round two is an issue; a third is the operator's.
- A defect the first round missed in the same diff is still this change's: correct it before the merge, not after.
- A reasoned refusal is an answer. Weigh it, and approve when it holds.
- Hand a point back once, with `gh pr edit <n> --add-reviewer <login>`.
- Still apart? The operator decides.

## Where it goes

Post it as a formal review, the findings as its body, written to a file and passed with `--body-file`:

```sh
gh pr review <n> --request-changes --body-file <path>   # or --approve
```

A `block` is not the author's work order, so post it with `--comment`. An earlier `CHANGES_REQUESTED` still blocks the merge, and a review that only comments wakes nobody.

Read your own earlier reviews first. At an unmoved head a second is noise; at a moved head, name what earlier rounds settled.

## What a review is not

- Not style the formatter enforces.
- Not a sweep. A false line is corrected where it is false, and an inconsistency beside the diff is its own issue.
- Not a redesign or a scope increase.
- Not a security pass over merged code. That is a separate audit.
