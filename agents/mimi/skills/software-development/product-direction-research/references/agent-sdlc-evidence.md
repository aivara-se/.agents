# Evidence base: agent-run SDLCs

Condensed findings that change a build ranking. Each line: what it says, what it implies for a small agent fleet. Re-check a source before quoting it as current; models move in months.

## The bottleneck has moved off code generation

- **Bain, *The Missing Architecture for Agentic Software Development* (Sep 2026, survey n=293).** Developers complete ~21% more tasks, but review time rises ~91%. The binding constraint is no longer model capability but the connective architecture: machine-readable knowledge, a deterministic quality harness, and treating the SDLC itself as a product.
  - Implication: a project that only writes more code adds to the queue. Value sits in the record, the verification, and the routing.
- **Zylos, *Agent-Orchestrated Software Development* (Jun 2026).** SWE-bench resolution went 1.96% (Oct 2023) to 80%+ (Apr 2026). Orchestration — who plans, delegates, enforces quality — is the new limiting layer, not snippet generation.

## Long-horizon work is where agents still fail

- **SWE-EVO (arXiv 2512.18470).** Best agents: 72.8% on SWE-bench Verified vs 25% on long-horizon tasks averaging 21 changed files. Multi-iteration, multi-file evolution is the weak mode.
  - Implication: per-patch benchmarks overstate a fleet that must carry a card from intent to merge. Measure across the lifecycle, not the patch.

## Review agents are good but context-bound

- **CRBugBench, *(When) Should a Software Factory be Lights-off?* (Oct 2026).** Best reviewer catches 71.9% of human-verified bugs in its top-5 comments, up from 47.7% five months earlier; sharp drop on proprietary repos where project context is needed. Guidance: supply repository knowledge, scale review effort to PR complexity, dispatch models by PR characteristics, monitor quality as models change.
  - Implication: review quality is a function of supplied context and routing, both of which need per-PR data to tune.

## Spec-driven development is the industry's answer to intent

- **GitHub Spec Kit / Kiro.** Structured spec → plan → tasks artifacts before implementation. Useful as a reference for what a spec gate must contain (acceptance criteria as executable outcomes), not as a dependency to adopt wholesale.
  - Implication: a card's *Done means* is the natural spec; the missing piece is executing it as checks, not writing more prose.

## A passing result is not a good result

- **AgentLens, *Revealing the Lucky Pass Problem in SWE-Agent Evaluation* (Microsoft + UIUC, arXiv 2605.12925).** Of 1,815 passing OpenHands trajectories, 10.7% are *Lucky Passes*: regression cycles, blind retries, missing verification, or verification ordered after implementation. Ranking by process quality instead of pass rate moves model backends by up to five positions.
  - Implication: a run record that stores only pass/fail cannot separate a solid run from a lucky one. Store which checks ran, in what order, and what regressed — otherwise the record cannot rank anything.
- **SWE-Bench Pro V2 (arXiv 2610.24206).** 480 of 731 tasks repaired or retired after agentic audits; frontier agents resolve up to 99.4% of the 642-task public split, while the 51-task Hard split spreads 52.9–98.0%.
  - Implication: public coding benchmarks have saturated at the top. A vendor's score cannot rank our options; our own cards are the only measure that discriminates.

## Metrics are platform-specific

- **GitHub Copilot usage metrics API (2026).** Reports per-repo agent PR activity for Copilot and partner agents. A self-hosted or bespoke fleet has no equivalent feed.
  - Implication: fleet-level outcome metrics are an unserved gap for small operators; the data is assemblable from webhooks + the GitHub timeline.

## Observability conventions worth reusing

- **OpenTelemetry GenAI semantic conventions (agent spans).** Standard attribute names for agent/model/tool spans, still in development. Worth borrowing names for a run record so a later export to an OTel backend is a mapping, not a rewrite.
- **Langfuse-class tools.** Strong at LLM-call tracing and cost, weak at the work item: they do not know a card, a review round or a merge. A fleet record should join to the work item, not replace tracing.
