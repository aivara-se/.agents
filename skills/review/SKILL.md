---
name: review
description: How to review another agent's change: what to check, the verdict, and the report.
when-to-use: A pull request or a task handoff is waiting on your review. Never for your own work — the author of a branch never reviews it.
---

# Review

## Do this, in order

1. Read the body and the conversation: what was claimed, what the task asked, and what the operator said in the thread. A claim the diff does not support is a finding.
2. Read the diff twice — once for what it does, once for what it leaves undone: the caller nobody updated, the test that would have caught it, the document it made untrue, the error path that swallows.
3. Run it. Check out the head, run the checks the repository gates on, and exercise what the change claims to fix. A reviewer who did not run the change is reading, not reviewing.
4. Test the claim: feed the empty input, reproduce the bug on the parent commit, and prove a new test pins the fix — take the fix out under the head's tests and watch them fail.
5. Look at what the checks cannot see: swallowed errors, a public surface that grew, a dependency that appeared, a gate skipped and reported as passing, a credential or personal data in the diff.

**An accepted ADR is immutable.** A change overrides it with a new ADR that names the clauses it replaces; an edit to an accepted record, or a body that claims one, is a finding, and only the operator can sanction an edit in place. PRODUCT, SYSTEMS and README are edited freely.

## Before you request changes

A request for changes wakes the author and spends a round of a loop, so it clears the same gate as a finding:

- **It is true** — you reproduced it, and the evidence is the command or input and its output.
- **It is the change's to fix** — the task asked for this and the change misses it. The task is the issue, the card or the operator's request and every criterion it names; a finding about work it never asked for is not a request for changes, however right the idea is — name it to the author as a follow-up and let the operator order it.
- **It is the smallest fix that settles it** — no new abstraction, script, gate or document for a case nobody has hit, and no rework that costs more than the defect.

## The verdict

Return exactly one, and put it on the first line:

- `approve` — you ran it and found nothing that must change before it lands.
- `request changes` — with each item carrying file, line and the evidence.
- `block` — only when the decision is not yours. Say who must decide.

**Never** approve a change you did not run, or the pull request you authored. **An approval can be the merge**: an armed pull request lands on it, so read `gh pr view <n> --json mergeStateStatus,statusCheckRollup` before you post, and do not approve a head that is behind the default branch.

## The report

Lead with the verdict, then the findings that block the merge — nothing else. No summary, no restatement of the diff, no praise, no run log. When nothing blocks it, the verdict line and one line naming what was run.

Report only what the author has to act on to land the change, and only what you reproduced. Each finding is at most three lines:

- what is wrong, and the file and line it is wrong at;
- the evidence: the command, the input or the output;
- the fix: the smallest change that settles it.

A nit, a style the formatter already enforces, and a "worth doing later" are not findings.

## The loop

- A request for changes goes back to the author. A reasoned refusal is an answer: weigh it and approve when it holds.
- Hand a point back with `gh pr edit <n> --add-reviewer <login>`, once, with the ask beside the review.
- Where the two of you are still apart, that is the operator's call, not another round.

## Where the verdict goes

Post it as a formal review with the report as its body, written to a file and passed with `--body-file`.

```sh
gh pr review <n> --request-changes --body-file <path>   # or --approve
```

Read your own earlier reviews before posting. At an unmoved head a second review is noise unless the verdict changed; at a moved head your last `request changes` still blocks, so post the fresh verdict and name the findings earlier rounds settled.

## What a review is not

- Not a second opinion on style the formatter enforces.
- Not a redesign, and not a scope increase: the version acknowledges its gaps, and a shape the documents settled is not the diff's to revise.
- Not a rewrite: request the small fix, or say what makes the change unsalvageable.
