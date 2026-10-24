---
name: review
description: "How to review another agent's change: verdict and report."
when-to-use: A pull request or a task handoff is waiting on your review. Never for your own work — the author of a branch never reviews it.
---

# Review

## Do this, in order

1. **Write the item's contract down before you read the diff**: what it must do — the criteria, the issue, the operator's request — what it must never do, and what it declares out of scope. Every finding answers to a line of it.
2. Read the body and the conversation: what was claimed, what the task asked, and what the operator said in the thread. A claim the diff does not support is a finding.
3. Read the diff twice — once for what it does, once for what its body says it does. The gap between the two, and a criterion it does not meet, are findings; the work it could have done instead is a follow-up issue.
4. Run it. Check out the head, run the checks the repository gates on, and exercise what the change claims to fix. A reviewer who did not run the change is reading, not reviewing. **Pin the sha**: record `headRefOid` and review that commit, not the branch — an author fixing findings, or a peer's rebase-merge, moves the head under you, and a review attached to a sha you never read is a finding that may already be gone.
5. Test the claim: feed the empty input, reproduce the bug on the parent commit, and prove a new test pins the fix — take the fix out under the head's tests and watch them fail.
6. Look at what the checks cannot see **in the lines the change wrote, or the lines it made false**: swallowed errors, a public surface that grew, a dependency that appeared, a gate skipped and reported as passing, a credential or personal data in the diff. Unchanged code in a touched file is not this change's to answer for.

When the change is a decision record, verify its claims against the primary source — the payload schema, the runtime's own source, the CLI's help — not against its prose. A consequence that contradicts a decision bullet (a wake its own actor rule suppresses; a tag that stops hiding a session) is the finding: the record is the specification the code will follow. Test the record against the sources and against itself, not against the decision you would have made: a record you would have written differently is a new record, and opening one is the operator's or the architect's.

**An accepted ADR is immutable.** A change overrides it with a new ADR that names the clauses it replaces; an edit to an accepted record, or a body that claims one, is a finding, and only the operator can sanction an edit in place. PRODUCT, SYSTEMS and README are edited freely.

## Before you request changes

A request for changes wakes the author and spends a round of a loop, so it clears the same gate as a finding:

- **It is true** — you reproduced it, and the evidence is the command or input and its output.
- **It is the change's to fix** — a line of the contract it misses or breaks. A finding about work the item never asked for is not a request for changes, however right the idea is: it is an issue, if it is worth one.
- **It is the smallest fix that settles it** — a correction to what the change put there, not an addition to it: no new field, file, abstraction, script, gate or document for a case nobody has hit, and no rework that costs more than the defect. A finding whose fix makes the change bigger needs a criterion behind it.

## The verdict

Return exactly one, and put it on the first line:

- `approve` — you ran it and found nothing that must change before it lands.
- `request changes` — with each item carrying file, line and the evidence.
- `block` — only when the decision is not yours. Say who must decide.

**Never** approve a change you did not run, or the pull request you authored. **An approval can be the merge**: an armed pull request lands on it, so read `gh pr view <n> --json mergeStateStatus,statusCheckRollup` before you post, and do not approve a head that is behind the default branch.

## The report

Lead with the verdict, then the findings that block the merge — nothing else. No summary, no restatement of the diff, no praise, no run log. When nothing blocks it, the verdict line and one line naming what was run.

Report only what the author has to act on to land the change, and only what you reproduced. Each finding names the contract line it defends — the criterion it misses, the claim it falsifies, the caller it breaks — and a finding that defends none is deleted, not softened. Each finding is at most three lines:

- what is wrong, and the file and line it is wrong at;
- the evidence: the command, the input or the output;
- the fix: the smallest change that settles it.

One line says what you ran; at a moved head, one line says which earlier findings are settled. Anything longer is a run log.

A nit, a style the formatter already enforces, and a "worth doing later" are not findings.

## The loop

- **Rounds converge.** The first round finds. Every round after it is a verdict on the findings already made, the contract, and what the fix itself broke; a subject that first appears later is an issue, not a finding. A change still blocked after two rounds is the operator's to merge, split or drop.
- A request for changes goes back to the author. A reasoned refusal is an answer: weigh it and approve when it holds.
- Hand a point back with `gh pr edit <n> --add-reviewer <login>`, once, with the ask beside the review.
- Where the two of you are still apart, that is the operator's call, not another round.

## Where the verdict goes

Post it as a formal review with the report as its body, written to a file and passed with `--body-file`.

```sh
gh pr review <n> --request-changes --body-file <path>   # or --approve
```

Read your own earlier reviews before posting. At an unmoved head a second review is noise unless the verdict changed; at a moved head your last `request changes` still blocks, so post the fresh verdict and name the findings earlier rounds settled. Read `headRefOid` immediately before posting and name it in the body: a push dismisses approvals (`dismiss_stale_reviews_on_push`), so a verdict is only about the head it names, and one posted against a head you did not read blocks on a finding the author may have already fixed.

## What a review is not

- Not a second opinion on style the formatter enforces.
- Not a sweep: a document the change makes false is corrected on the line that is false, and an inconsistency beside the diff is its own issue.
- Not a redesign, and not a scope increase: the version acknowledges its gaps, and a shape the documents settled is not the diff's to revise.
- Not a rewrite: request the small fix, or say what makes the change unsalvageable.
- Not a security pass over the repository: that reads merged code and returns ranked findings, not one verdict — a separate pass, not a review of a diff.
