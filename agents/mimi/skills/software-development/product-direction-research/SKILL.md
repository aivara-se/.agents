---
name: product-direction-research
description: "Use when asked what to build next for the lab."
version: 1.0.0
author: MiMi (thani-sh-mimi)
license: MIT
metadata:
  hermes:
    tags: [research, product, sdlc, strategy, agent-fleet]
    related_skills: [change-planning, aivara-board, spike, writing]
---

# Choosing the next project

Map the SDLC against what the stack actually covers, ground the gap in external evidence, and return ranked candidates with one recommended default and a scoped v1.

## When to Use

- The operator asks what to build next, or to research where the lab's stack should go.
- A project has just landed and the next one is open.
- A proposal needs a ranked answer rather than a single idea.

## The job

The deliverable is a decision package: what the stack covers, the one stage nothing covers, two or three candidates with cost and what each unlocks, and a recommended default with a scoped v1. Building starts only after the operator picks. He decides in batches and answers as a numbered list.

## Procedure

1. **Inventory what exists, from source not marketing.** `gh repo list <org> --limit 100`, then each repo's `docs/PRODUCT.md` (behaviour truth), `docs/SYSTEMS.md` (architecture) and `docs/adrs/` (the decisions that constrain the answer). The org site's `projects.json` and repo READMEs lag renames — the repos and git log are the truth.
2. **Read the board as a state fact, not a plan.**
   ```sh
   gh api graphql -f query='{ organization(login:"aivara-se"){ projectV2(number:2){ title items(first:60){ totalCount nodes{ content{ ... on Issue { number title repository{name} } } fieldStatus:fieldValueByName(name:"Status"){ ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }'
   ```
   `totalCount` is the number to trust — an empty `nodes` with a non-zero count is a field-name or alias error, not an empty board.
3. **Map the SDLC phases against artifacts, not intentions.** Intake, spec, build, review, verify, release, operate, learn. Name the artifact that covers each (a doc, a service, a CI gate, a person's habit). The gap is the phase with no artifact — not the phase whose artifact is weakest.
4. **Read the ADR that created the gap.** A deliberate omission ("the run is not tracked", "nothing is reconciled at boot") is the strongest finding: it names the boundary the next project moves. Quote the decision, not a guess about it.
5. **Ground each phase claim in 3–5 numbered sources.** Prefer primary research and vendor reports with sample sizes over listicles. Keep only findings that change the ranking. `references/agent-sdlc-evidence.md` holds the current evidence base; extend it rather than re-searching from zero.
6. **Check the market gap, not just the technical one.** If a platform reports the metric for its own agents, a bespoke fleet has no equivalent — that asymmetry is a product.
7. **Rank by dependency, not novelty.** The project that produces the numbers comes before the project that optimizes on them. Say plainly what cannot be judged until the first one lands.
8. **Scope v1 to the smallest thing that answers the question.** Include: the change to the existing service, the new service's store, the one CLI read, and *Done means* as a checkable sentence. Add an explicit not-in-v1 list.
9. **Flag host-only unknowns as open questions.** Anything that lives outside the sandbox (token usage per session, deploy state) is a question to verify before promising it, never an assumption in the plan.

## Shape of the answer

- Coverage of the lifecycle first, one line per phase, no preamble.
- Research findings as bullets with the number and its source in the same line.
- Candidates: cost in build cycles, what each unlocks, what it does not. One recommended default, marked.
- v1 scope, *Done means*, deliberate exclusions.
- End with the decision, not a summary. No building while it is open.
- Offer the candidates numbered so a subset can be accepted. He answers with the ones he wants ("all good, skip N"), and each accepted item then becomes its own version with its own ADR.

## Pitfalls

- **A stage that already has a strong artifact is not the gap.** Per-repo `PRODUCT.md`/ADRs and a peer review loop are the lab's best assets; proposing a second spec system duplicates them. Look for the phase whose output nobody writes down.
- **Do not recommend measurement you cannot instrument.** Check where the data is produced before pricing the project: an untracked child process has no exit code, no duration and no run id to join on. The instrumentation change belongs in v1's scope, not in a later phase.
- **Cost per run is not free to obtain.** Model spend lives in the runner's session store on the host, not in the trigger service; if the sandbox cannot see it, v1 measures runs, wall-clock and outcomes and cost becomes v2.
- **A stale public project list is a signal about the process, not a source.** If the site names a repo that no longer exists, use it as evidence that the published layer lags and read the org instead.
- **A clone behind origin shows yesterday's roadmap.** `git pull --ff-only` before reading `PRODUCT.md` or `docs/adrs/`; a brainstorm from a stale tree proposes versions the repository has already decided. Read the highest ADR number and the roadmap block first — they are the record of what is already committed to, so sharpen a decided item or propose the version after it, never re-propose it.
- **A pass rate is not a quality score.** About one in ten passing agent trajectories passes by luck — blind retries, no verification, regressions. A run record must store the process, or it cannot rank runs or models.
- **One recommendation, not a menu of equals.** Two or three candidates maximum, the default first with its reason, and the condition under which the second becomes right.

## References

- `references/agent-sdlc-evidence.md` — external findings on agent-run SDLCs: what moved the bottleneck, long-horizon failure rates, review-agent detection, the lucky-pass problem, benchmark saturation, and platform metric gaps.
