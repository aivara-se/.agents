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

Map the SDLC against what the stack covers, ground the gap in external evidence, and return ranked candidates with one default and a scoped v1.

## When to Use

- The operator asks what to build next, or where the stack should go.
- A project has just landed and the next one is open.
- A proposal needs a ranked answer rather than a single idea.

## The job

The deliverable is a decision package: what the stack covers, the one stage nothing covers, two or three candidates with cost and what each unlocks, and a recommended default with a scoped v1. Build only after the operator picks; he decides in batches and answers as a numbered list.

## Procedure

1. **Inventory from source, not marketing.** `gh repo list <org> --limit 100`, then each repo's `docs/PRODUCT.md` (behaviour truth), `docs/SYSTEMS.md` (architecture) and `docs/adrs/`. Site indexes and READMEs lag renames.
2. **Read the board as a state fact, not a plan.**
   ```sh
   gh api graphql -f query='{ organization(login:"aivara-se"){ projectV2(number:2){ title items(first:60){ totalCount nodes{ content{ ... on Issue { number title repository{name} } } fieldStatus:fieldValueByName(name:"Status"){ ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }'
   ```
   Trust `totalCount`, and check the returned `title` is `Development` before you trust an empty list: projects are renumbered on a rebuild, so zero items under another title is a different board, not an empty one. Resolve the number from `projectsV2(first:20){ nodes{ number title } }`.
3. **Map phases to artifacts, not intentions.** Intake, spec, build, review, verify, release, operate, learn — name the artifact covering each. The gap is the phase with no artifact, not the weakest one.
4. **Read the ADR that created the gap.** A deliberate omission ("the run is not tracked") names the boundary the next project moves. Quote the decision.
5. **Ground each phase claim in 3–5 numbered sources**, preferring primary research with sample sizes. Keep only findings that change the ranking; extend `references/agent-sdlc-evidence.md` rather than re-searching.
6. **Check the market gap too.** If a platform reports a metric for its own agents and a bespoke fleet has no equivalent, that asymmetry is a product.
7. **Rank by dependency, not novelty.** The project that produces the numbers comes before the one that optimizes on them, and say what cannot be judged until the first lands.
8. **Scope v1 to the smallest thing that answers the question**: the change to the existing service, the new store, the one CLI read, _Done means_ as a checkable sentence, and an explicit not-in-v1 list.
9. **Flag host-only unknowns as open questions.** Anything outside the sandbox (token usage, deploy state) is verified, never assumed.

## Shape of the answer

- Lifecycle coverage first, one line per phase, no preamble.
- Findings as bullets with the number and its source on the same line.
- Candidates: build cost, what each unlocks, what it does not; one default, marked.
- v1 scope, _Done means_, deliberate exclusions.
- End with the decision, not a summary. Number the candidates so a subset can be accepted; each accepted item becomes its own version with its own ADR.

## Pitfalls

- **A stage that already has a strong artifact is not the gap.** Per-repo `PRODUCT.md`/ADRs and a peer review loop are the lab's best assets; a second spec system duplicates them.
- **Do not recommend measurement you cannot instrument.** An untracked child process has no exit code, duration or run id; that instrumentation belongs in v1.
- **Cost per run is not free to obtain.** Model spend lives in the runner's session store on the host, not the trigger service; if the sandbox cannot see it, v1 measures runs, wall-clock and outcomes and cost becomes v2.
- **A stale public project list is a signal, not a source.** Read the org instead.
- **A clone behind origin shows yesterday's roadmap.** `git pull --ff-only` before reading `PRODUCT.md` or `docs/adrs/`. Read the highest ADR number and the roadmap block first — sharpen a decided item or propose the version after it, never re-propose it.
- **A pass rate is not a quality score.** About one in ten passing agent trajectories passes by luck. A run record must store the process, or it cannot rank runs or models.
- **One recommendation, not a menu of equals.** Two or three candidates maximum, the default first, and the condition under which the second becomes right.

## References

- `references/agent-sdlc-evidence.md` — external findings on agent-run SDLCs: what moved the bottleneck, long-horizon failure rates, review-agent detection, the lucky-pass problem, benchmark saturation, and platform metric gaps.
