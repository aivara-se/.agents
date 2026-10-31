---
name: security-audit
description: "Use when attacking a repo: security pass with proof."
when-to-use: The ask is a security pass, a vulnerability hunt, "attack this", or "does this change leak anything" — not a verdict on one pull request (that is `review`).
version: 1.1.0
author: MoMo (Aivara)
license: MIT
metadata:
  hermes:
    tags: [security, audit, review, probes, go, javascript]
    related_skills: [review, testing, coding]
---

# Security audit

A pass is a set of proven findings, not a list of suspicions. Every line that reaches the operator is carried by a probe and the output that proves it.

## When to Use

- The operator asks for a security pass, a vulnerability hunt, or to attack a repository or service.
- You are reading merged code, not a diff, and the output is a ranked list of findings rather than one verdict.
- The ask is "does this PR or commit leak anything": the same pass with the change as scope — one verdict and what held, never a ranked hunt.
- Not for a pull request waiting on a verdict — that is `review`; not for scanning your own uncommitted diff — that is `requesting-code-review`.

## Do this, in order

1. **Fix the tree.** `git fetch --prune`, check out the default branch, record `<repo>@<sha>`. A clone is often parked on an old review branch (detached head at `origin/<branch>`) — reset to `origin/main` and say which tree the pass covers. When the organisation has two similarly named repositories, find which one carries code before attacking either.
2. **Read the project's claims as test cases.** AGENTS.md, PRODUCT, SYSTEMS, the ADRs: every sentence about behaviour is something the code must keep, and the safety ones most of all ("an unsigned request costs a header check", "never wakes the actor", "a redelivery wakes nobody"). A claim the code does not keep is a finding.
3. **Run the gate as the repository defines it**, and quote it with the tree. A pass that did not build is a reading.
4. **Read every package, and the tests.** The tests show what the author thought about; the flow nobody tested is where the defect is. Read merged code, not only the last diff.
5. **Copy to scratch before writing probes**: `cp -a ~/github/<owner>/<repo> ~/scratch/<agent>/<repo>-sec`. Never dirty the clone, never push a probe.
6. **Prove each finding.** Run the probe against the real packages, not a paraphrase, and keep the probe that shows the thing held — "what held" is part of the report. Then apply the smallest fix in the scratch copy and re-run the same probe: a fix that was not re-run is a suggestion.
7. **Rank by what an attacker gains**, not by how interesting the bug is: what it reaches (a secret, the rest of the fleet, availability), what it needs (network only, a member, a compromised agent), and how cheap the fix is.
8. **Report**, then offer the next action: the issues to file, or the PR with the smallest fix.

## A pass scoped to a diff

A leak ask is the same pass with a narrower tree: one verdict carried by a scanner and a read, plus what held.

1. **Pin the change.** `git fetch origin '+refs/pull/<N>/head:refs/remotes/pr/<N>'`, record that head sha and `origin/main`, and diff into scratch. Never scan the working tree of a clone parked on some other branch.
2. **Scan the commits, not only the final tree.** A secret committed and deleted in a later commit is still on the pull request page and lands with a merge commit; a tree scan sees neither. Run both.
3. **Check the repository's own visibility first.** It sets the severity of every line after it.
4. **Answer the second half.** No credential is not "nothing sensitive": a private repository's name, an internal identifier, a host path, a home directory and contact data are what a public repository leaks without any key. Resolve each one — a name's `visibility`, an id's `public` flag — instead of calling it suspicious or safe.
5. **Verify the guard the change claims.** A body that says something refuses a secret names code: find it. A guard outside the repository, or not wired into the workflow that runs on every push, is unverifiable — say so and say what CI actually runs.

Commands, the pattern set, the false-positive filters and the hash-manifest trap are in `references/leak-scan.md`.

## What to attack

Trust boundaries first — they outrank the business logic:

- **What the process hands to its children.** `exec.Command` with `Env` unset inherits the whole service environment, so every secret the service holds is readable by every agent it starts; a secret in the environment is a secret the fleet has.
- **What the signature does not cover.** Headers used for decisions — dedupe ids, event names — sit outside an HMAC over the body, so state keyed on them can be replayed.
- **What costs work before authentication.** Body reads, HMACs, allocations, and whatever bounds concurrency on the unauthenticated path.
- **What a stranger controls.** Text that reaches a prompt, argv, a log line or a path; identifiers compared case-sensitively where the platform calls them case-insensitive.
- **What never goes away.** In-memory maps keyed by external identifiers, caches, counters, goroutines.
- **What the operator has to read afterwards.** An audit record that says a thing did not happen when it did is a security defect: it is the only evidence there is. The sentence on a failure screen counts too — "the file was not changed", "nothing was saved" — when the bytes say otherwise, because that text is what the person acts on.

## The report

- **Scope first**: `<repo>@<sha>`, the gate commands and their result, one line naming what was out of scope.
- **Findings, worst first.** Each is at most four lines: severity and the defect in one sentence; `file:line`; the evidence, quoted from the probe; the smallest fix that settles it.
- **What held** — one short paragraph: what was attacked and found sound. It says what was covered, not what was admired.
- **One closing line** offering the next action (file the issues, open the PR). No summary of the pass, no restatement of the architecture.
- **The report is a file, the message is 150 words.** `~/scratch/<agent>/<repo>-security-report.md` carries every finding with its probe output quoted beneath it; the chat message names the worst two and the path (`writing` fixes the length).
- **File the issues when asked, worst first.** One per finding: a title that states the defect and its consequence, then the claim as `doc:line`, the probe output, `## What to build`, `## Done means`. File the critical one too when the offer was to fix it in an open PR — the issue is the tracker, and the PR can close it.

## Pitfalls

- **An unreproduced suspicion is not a finding.** Stress a suspected race with a barrier and `-count=30`; if it does not reproduce, drop it rather than softening it to "may be racy".
- **The code's own dedupe swallows a probe loop.** A probe that feeds N inputs under one identifier measures one: a delivery-id cache, an upsert guard (`WHERE excluded.seq > stored.seq`), an insert-once key or any memo drops the rest, and the dropped attempts then read as defects. Give every iteration its own id, key and counter. The run gate swallows a replay the same way: a second delivery on a live key is held, not started, so measure replay with a runner that returns at once.
- **Sign with the key the thing under test was built with.** A repository's HTTP test helper signs with its fixture secret; against a config-derived key it answers 401 and looks like a defect. Build the signature from the key the test just loaded.
- **Measure the claim, not just its code.** "Costs a header check" is disproved by counting allocations (`runtime.ReadMemStats`) for one unauthenticated request, not by reading the handler.
- **A write verified by reading the value back is defeated by any value the store normalises.** Lone surrogates, `char(n)` padding, case-folded collation and re-ordered JSON all come back different, so a committed write is reported as a failed one. Probe the encodings the store cannot hold, and keep a control for each one it can.
- **A partial failure reported as total** is a finding: a loop that starts several things and keeps only the first error reports that nothing started when something did.
- **A verification loop that fails on every entry is the parser, not the data.** A manifest shaped `{"path": {"sha256": …, "origin": …}}` compared against the hex string reports a 100% mismatch on a clean tree; print one entry, check it by hand with `sha256sum`, then trust the loop. The positive count is the evidence — "117 entries, 0 mismatch".
- **Do not widen the pass into a redesign.** Name the smallest fix; where the fix is a design decision (a secret reachable by a shared uid), say so and say whose call it is.

Probe recipes for a Go service — child environment, leaked-key forgery, unauthenticated cost, unbounded state — are in `references/probe-tests.md`. For a JavaScript backend on a local runtime (a tinyjs desktop app): the harness that runs the real handlers, and the store, string-round-trip and corrupt-file probes, are in `references/probe-tests-js.md`. For a leak pass over a diff: `references/leak-scan.md`.
