---
name: review
description: How to review another agent's change: the checks that decide a verdict, and what to do with it.
when-to-use: A pull request or a task handoff is waiting on your review. Never your own work.
---

# Review

## Do this, in order

1. Read the body and the thread: what was claimed, what the task asked, what the operator said there.
2. Read the diff twice — for what it does, and for what it leaves undone: the caller nobody updated, the test that would have caught it.
3. Run it at a pinned sha (`headRefOid`), not the branch. An author's fix or a rebase moves the head under you.
4. Test the claim: the empty input, the bug reproduced on the parent, the new test failing with the fix removed.
5. Look at what checks cannot see: swallowed errors, a widened public surface, a new dependency, a credential in the diff.

A decision record is verified against the primary source — the schema, the runtime's source, the CLI's help — not its prose.

**An accepted ADR is immutable.** A change overrides it with a new ADR naming the clauses it replaces. An edit to an accepted record is a finding; only the operator can sanction one.

## Before you request changes

- It is true: you reproduced it, and the evidence is the command and its output.
- It is the change's to fix: the task asked for this and the diff misses it.
- It is the smallest fix: no abstraction, gate or document for a case nobody has hit.

A point that fails any of these is a follow-up for the operator to order, not a request.

## The verdict

Return exactly one, on the first line:

- `approve` — you ran it and nothing must change before it lands.
- `request changes` — each item with file, line and evidence.
- `block` — the decision is not yours. Say who must decide.

Never approve what you did not run, or your own branch. An approval can be the merge: read `mergeStateStatus` and `statusCheckRollup` before you post.

## The report

`writing`'s `references/writing-reviews.md` has the shape: verdict first, three lines per finding, nothing else.

## The loop

- A request for changes goes back to the author. A reasoned refusal is an answer: weigh it and approve when it holds.
- Hand a point back once, with `gh pr edit <n> --add-reviewer <login>`.
- Still apart after that? The operator decides, not another round.

## Where it goes

Post it as a formal review with the report as its body, written to a file and passed with `--body-file`:

```sh
gh pr review <n> --request-changes --body-file <path>   # or --approve
```

Read your own earlier reviews first. At an unmoved head a second review is noise; at a moved head, name what earlier rounds settled.

## What a review is not

- Not style the formatter enforces.
- Not a redesign or a scope increase: a shape the documents settled is not the diff's to revise.
- Not a security pass over merged code: that is a separate report, not a verdict.
