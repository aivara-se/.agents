---
name: review
description: How to review another agent's change, what the verdict must contain, and the fixed report schema that makes two reviews comparable.
when-to-use: A pull request or a task handoff is waiting on your review. Never for your own work — the author of a branch never reviews it.
---

# Review

## Do this, in order

1. Read the task or pull request body: what was claimed, and what the acceptance criteria are. The claim and the task are not always the same thing, and the difference is a finding. The body summarises the significant changes and how they were verified — it does not restate the diff, which is what the change view is for — and a claim in it the diff does not support is a finding.
2. Read the diff twice — once for what it does, once for what it does **not** do: the caller nobody updated, the test that would have caught it, the document it just made untrue, the error path that swallows. Confirm first that the diff is the pull request's own: a local `main` that lags the PR's base makes `main...HEAD` include every commit the branch is merely built on — an order of magnitude too large, and a false size mismatch against the body. `gh pr view <n> --json baseRefOid,headRefOid,additions,deletions,changedFiles` names the base and the host's counts; read the change as `git diff <baseRefOid>...HEAD` (fetch that commit first when the clone lacks it) and take the host's counts as truth.
3. Run it. Check out the branch (`gh pr checkout <n>`), run the checks this repository gates on — whatever CI runs, where there is CI — and exercise the thing the change claims to fix. A reviewer who did not run the change is reading, not reviewing. Where the claims are about runtime behaviour the repository's tests stub away — a boot, an order between two side effects, a refusal, a repeat, a restart — run the real artifact against stubs of its backends: `references/probing-a-running-change.md` is the recipe, `templates/stub-backend.py` its skeleton.
4. Test the claim, not the description: if the body says empty input is handled, feed it empty input; if it says the bug is fixed, reproduce the bug on the parent commit first. Where the change claims a new test pins the fix, prove the pin: in a worktree at the head, restore the parent's implementation under the head's tests (`git worktree add <dir> HEAD`, `git checkout <parent> -- <file>`) and run the added tests — they must fail on the lines the fix moved. Where the change moves a signature its own tests call — an interface method, a keyed map — the parent's file does not compile under the head's tests, and the honest pin is a mutation of the head's implementation instead: drop half of what the change added (the repository from the identity), run the suite under an explicit `-timeout`, and read which tests go red on the lines the fix moved — where the change stops a boot, the mutated artifact serves instead of stopping, and an unbounded run hangs rather than fails. **A mutation that goes red nowhere is itself the finding:** where the change states a rule — in the card it closes, in its own comment, in the document it edits — and removing the code that implements it leaves the gate green, that rule is implemented and unpinned, and the next touch drops it in silence. Prove it load-bearing before you report it: run the head and the mutated artifact over the same content arranged so the two must disagree — for a rule about *which* of two read items is chosen, have the stub answer them in the opposite order — and show they decide differently (`references/probing-a-running-change.md`). For a change that asserts facts about the tree — documentation, a map, a claims edit — falsify every present-tense assertion with one command each: does the path it names exist (`git ls-files`), does the check it says runs actually run (`gh pr checks`), does the fact it says lives elsewhere live there.
5. Look at what the checks cannot see: silently swallowed errors, a public surface that grew, a dependency that appeared, a gate that was skipped and reported as passing, credentials or personal data in the diff. Treat every clause that states a rule — an ADR *Decision*, an acceptance line, a step in the systems document — as falsifiable against the tree: find the implementation (`go doc`, `search_files`, `git blame` for whose line it is) before you believe it, because a record written ahead of the code and never reconciled is how the tree and its own documents part ways. A defect in already-merged lines is a finding of this review when this change is what makes it reachable — the first caller, the first production trigger: the change fixes it or carries the card that owns it. Before calling one a blocker, look for the card (`gh issue list --state all --search "<the clause>"`) and read its *Done means*; where a card owns the rule, report it as carried, and a body that leaves it unnamed is a finding of its own.

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

## Where the verdict goes

Post it on the pull request as a formal review — `approve` or `request changes` — with the report as the review's body, so the author and the PR carry it and not only the chat. Write the body to a file and pass `--body-file`: a report quotes code, and shell-quoting backticks is a losing game.

```sh
gh pr review <n> --request-changes --body-file <path>   # or --approve
gh api repos/<owner>/<repo>/pulls/<n>/reviews           # the verdict is on the PR
```

Read your own alias's earlier reviews *before* you post — a parallel or earlier session may have reviewed this same head — and read the review list and the host's decision back after. Say which verdict is current when an older one of yours sits on the same commit: a stale `approve` beside a current `request changes` reads as a mistake, and a dismissal is an admin action — on a member token the call returns the review unchanged. Where another reviewer's request or a required review still controls mergeability, report the two as separate facts rather than weakening or reversing the verdict. Confirm the head against your own review before posting a second one: where `headRefOid` is the commit your earlier review already carries and that verdict still holds, do not post it again — re-run the checks and report in the chat that the verdict stands at an unmoved head; a duplicate review is noise on the author's PR, and only a moved head or a changed verdict earns a new one. A moved head earns one when your last verdict was `request changes`: that review survives the author's pushes and keeps the pull request blocked — `reviewDecision` and `mergeStateStatus` both, because a push does not dismiss it — until you re-review, so read the commits since it, post the fresh verdict on the new head, and name the earlier findings settled in the body so the author is not left guessing which still stand. A fact an earlier review of yours stated about another branch's head — a conflict size, a commit — decays the moment that branch is pushed: re-read it before you restate it.

## What a review is not

- Not a second opinion on style the formatter already enforces.
- Not a redesign of the repository, or a request for work the task did not ask for.
- Not a rewrite: if the change can land with a small fix, request the small fix. If it cannot, say what makes it unsalvageable.
