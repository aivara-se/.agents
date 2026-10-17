---
name: review
description: How to review another agent's change, what the verdict must contain, and the fixed report schema that makes two reviews comparable.
when-to-use: A pull request or a task handoff is waiting on your review. Never for your own work — the author of a branch never reviews it.
---

# Review

## Do this, in order

1. Read the task or pull request body: what was claimed, and what the acceptance criteria are. The claim and the task are not always the same thing, and the difference is a finding. The body summarises the significant changes and how they were verified — it does not restate the diff, which is what the change view is for — and a claim in it the diff does not support is a finding.
2. Read the diff twice — once for what it does, once for what it does **not** do: the caller nobody updated, the test that would have caught it, the document it just made untrue, the error path that swallows.
3. Run it. Check out the branch, run the checks this repository gates on — whatever CI runs, where there is CI — and exercise the thing the change claims to fix. A reviewer who did not run the change is reading, not reviewing.
4. Test the claim, not the description: if the body says empty input is handled, feed it empty input; if it says the bug is fixed, reproduce the bug on the parent commit first.
5. Look at what the checks cannot see: silently swallowed errors, a public surface that grew, a dependency that appeared, a gate that was skipped and reported as passing, credentials or personal data in the diff.

## The verdict

Return exactly one, and put it on the first line:

- `approve` — you ran it and found nothing that must change before it lands.
- `request changes` — with the concrete change required, each item carrying file, line and the evidence that shows it.
- `block` — only when the decision is not yours: missing access, a product decision, an external service. Say who must decide.

**Never** approve a change you did not run, and **never** approve a change to a branch you wrote in this task. A review with no findings says so plainly; it does not invent findings to look thorough, and it does not pad with praise.

## The report

Lead with the verdict line, then the findings that block the merge — nothing else. No summary, no restatement of the body or diff, no praise, no run log, no information already on the pull request. When nothing blocks the merge, the report is the verdict line plus one line naming what was run.

Report a finding only when the author has to act on it to land the change. A nit, a style the formatter already enforces, a "nice to have", a "worth doing later" — none of them are findings, and none of them go in the report. Report only what you reproduced yourself: a finding you could not reproduce is a false positive, and is dropped.

- **A sentence carries its own scope** — its subject and the clause it sits in. A finding against the strongest reading it could bear is a false positive: the author dismisses it rather than fixes it, and the verdict is spent on a reading nobody wrote. Where a rule and the tree part company, quote the change's own words.
- **Every finding names the changed line it settles**, and what the merge turns on: the behaviour this change makes true, or the older defect this change makes reachable. The body's bookkeeping is not a finding — verify its check counts, its line references and its run log to decide, then leave them out of the report; a wrong number there blocks nothing and costs the author a reply.

Each finding is **at most three lines of on-screen text**, most severe first, in plain words and no labels:

- what is wrong, and the file and line it is wrong at;
- the evidence: the command, the input or the output that shows it, cut to the part that shows it;
- the fix: the smallest change that settles it.

Nothing else survives in a finding: not the rule's history, not how you came to it, not what the fix buys, not what the author got right. Write those three lines for the person fixing it, and leave out every word they would not act on.

Add a target design, or a low-risk-first sequence for the requested changes, only when the change cannot land with a small fix. Never a section the change does not need.

A finding, as it looks on screen:

```text
internal/router/router.go:388 — the reason handed to a run names the card's number alone, so two cards of one number start two identical runs.
Stub board, `9` in two repositories, both Backlog, neither held: two runs, each `card 9 sits in Backlog with nobody holding it` — the same board at the parent starts none.
Thread the identity into the reason the way the audit line already threads it.
```

## What a review is not

- Not a second opinion on style the formatter already enforces.
- Not a redesign of the repository, or a request for work the task did not ask for.
- Not a rewrite: if the change can land with a small fix, request the small fix. If it cannot, say what makes it unsalvageable.
