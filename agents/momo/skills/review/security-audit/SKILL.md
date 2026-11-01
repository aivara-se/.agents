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

A pass is proven findings, not suspicions. Every line you send the operator is carried by a probe and the output that proves it.

## When to Use

- A security pass, a vulnerability hunt, an attack on a repository.
- Merged code, not a diff; a ranked list, not one verdict.
- "Does this change leak anything": the same pass on a diff — one verdict and what held.
- Not a PR verdict (`review`), not your own diff (`requesting-code-review`).

## Do this, in order

1. **Fix the tree.** `git fetch --prune`, check out the default branch, record `<repo>@<sha>`. A clone often sits on an old review branch (detached at `origin/<branch>`): reset to `origin/main` and name the tree the pass covers. Two similarly named repos: find which carries code first.
2. **Run the gate** as the repo defines it, and quote it with the tree. A pass that did not build is a reading.
3. **Read every package, and the tests.** The untested flow holds the defect. Read merged code, not the last diff.
4. **Read the project's claims as test cases.** AGENTS.md, PRODUCT, SYSTEMS, ADRs: each sentence about behaviour is something the code must keep — "an unsigned request costs a header check", "never wakes the actor". A claim the code breaks is a finding.
5. **Copy to scratch** before you write a probe: `cp -a ~/github/<owner>/<repo> ~/scratch/<agent>/<repo>-sec`. Never dirty the clone, never push a probe.
6. **Prove each finding** against the real packages, not a paraphrase, and keep the probe that shows the thing held. Then apply the smallest fix in scratch and re-run it: a fix that was not re-run is a suggestion.
7. **Rank by attacker gain**: what it reaches (a secret, the fleet, availability), what it needs (network only, a member, a compromised agent), the cost of the fix. Then report, and offer the issues or the smallest-fix PR.

## A pass scoped to a diff

One verdict, carried by a scanner and a read, plus what held.

1. **Pin the change.** `git fetch origin '+refs/pull/<N>/head:refs/remotes/pr/<N>'`, record that head sha and `origin/main`, diff into scratch. Never scan the working tree of a clone parked on another branch.
2. **Scan the commits, not just the final tree.** A secret committed and deleted later is still on the PR page and lands with a merge commit; a tree scan sees neither. Run both.
3. **Check visibility first.** It sets the severity of every line after it.
4. **Answer the second half.** No credential is not "nothing sensitive": a private repo's name, an internal identifier, a host path, a home directory, contact data are what a public repo leaks without a key. Resolve each — a name's `visibility`, an id's `public` flag — instead of calling it suspicious or safe.
5. **Verify the guard the change claims.** A body that says something refuses a secret names code: find it. A guard outside the repo, or not wired into the every-push workflow, is unverifiable — say so, and say what CI runs.

Patterns, false-positive filters and the hash-manifest trap: `references/leak-scan.md`.

## What to attack

Trust boundaries first — they outrank the business logic:

- **What the process hands its children.** `exec.Command` with `Env` unset inherits the service environment: every secret the service holds is readable by every agent it starts.
- **What the signature does not cover.** Dedupe ids and event names are headers outside the HMAC over the body, so state keyed on them replays.
- **What costs work before authentication.** Body reads, HMACs, allocations, and whatever bounds concurrency on the unauthenticated path.
- **What a stranger controls.** Text reaching a prompt, argv, a log line or a path; identifiers compared case-sensitively where the platform is case-insensitive.
- **What never goes away.** Maps keyed by external identifiers, caches, counters, goroutines.
- **What the operator reads afterwards.** An audit record that says a thing did not happen when it did is a security defect — it is the only evidence there is. The failure screen counts too ("the file was not changed") when the bytes say otherwise.

## The report

- **Scope first**: `<repo>@<sha>`, gate commands and result, one line on what was out of scope.
- **Findings, worst first**, four lines at most: severity and defect in one sentence; `file:line`; the probe evidence quoted; the smallest fix.
- **What held** — one paragraph on what you attacked and found sound, not what you admired.
- **One closing line** with the next action. No pass summary, no architecture tour.
- **The report is a file; the message is 150 words.** `~/scratch/<agent>/<repo>-security-report.md` holds every finding with its probe output beneath it; the chat names the worst two and the path.
- **File issues when asked, worst first.** A title stating the defect and its consequence, the claim as `doc:line`, the probe output, `## What to build`, `## Done means`. File the critical one too when you offered to fix it in an open PR — the issue is the tracker and the PR can close it.

## Pitfalls

- **An unreproduced suspicion is not a finding.** Stress a race with a barrier and `-count=30`; if it does not reproduce, drop it, do not soften it to "may be racy".
- **The code's own dedupe swallows a probe loop.** N inputs under one identifier measure one: a delivery-id cache, an upsert guard (`WHERE excluded.seq > stored.seq`), an insert-once key or a memo drops the rest, and the dropped attempts read as defects. Give each iteration its own id, key and counter. The run gate swallows a replay the same way — a second delivery on a live key is held, not started — so measure replay with a runner that returns at once.
- **Sign with the key the thing under test was built with.** A helper signing with its fixture secret answers 401 against a config-derived key and looks like a defect.
- **Measure the claim, not its code.** "Costs a header check" is disproved by counting allocations (`runtime.ReadMemStats`) for one unauthenticated request.
- **A write verified by reading it back is defeated by any value the store normalises.** Lone surrogates, `char(n)` padding, case-folded collation and re-ordered JSON come back different, so a committed write reads as failed. Probe the encodings the store cannot hold, and keep a control for each one it can.
- **A partial failure reported as total** is a finding: a loop that starts several things and keeps only the first error reports that nothing started.
- **A verification loop that fails on every entry is the parser, not the data.** A manifest shaped `{"path": {"sha256": …, "origin": …}}` compared against the hex string reports 100% mismatch on a clean tree; print one entry, check it with `sha256sum`, then trust the loop — "117 entries, 0 mismatch" is the evidence.
- **Do not widen the pass into a redesign.** Name the smallest fix; where it is a design decision (a secret reachable by a shared uid), say so and whose call it is.

Go recipes — child environment, leaked-key forgery, unauthenticated cost, unbounded state — are in `references/probe-tests.md`. For a JavaScript backend on a local runtime (a tinyjs app): the harness that runs the real handlers, plus the store, string-round-trip and corrupt-file probes, in `references/probe-tests-js.md`. For a leak pass over a diff: `references/leak-scan.md`.
