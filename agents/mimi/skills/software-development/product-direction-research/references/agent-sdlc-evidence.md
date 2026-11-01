# Evidence base: agent-run SDLCs

Findings that change a build ranking. Each line: what it says, then what it implies for a small agent fleet. Re-check a source before quoting it as current.

## The bottleneck has moved off code generation

- **Bain, _The Missing Architecture for Agentic Software Development_ (survey n=293).** Developers complete ~21% more tasks, but review time rises ~91%. The binding constraint is the connective architecture: machine-readable knowledge, a deterministic quality harness, and the SDLC treated as a product.
  - Implication: a project that only writes more code adds to the queue. Value sits in the record, the verification and the routing.
- **Zylos, _Agent-Orchestrated Software Development_.** SWE-bench resolution went from 1.96% to 80%+ in under three years. Orchestration — who plans, delegates, enforces quality — is the limiting layer, not snippet generation.

## Long-horizon work is where agents still fail

- **SWE-EVO (arXiv 2512.18470).** Best agents: 72.8% on SWE-bench Verified versus 25% on long-horizon tasks averaging 21 changed files.
  - Implication: per-patch benchmarks overstate a fleet that must carry a card from intent to merge. Measure across the lifecycle.

## Review agents are good but context-bound

- **CRBugBench, _(When) Should a Software Factory be Lights-off?_** Best reviewer catches 71.9% of human-verified bugs in its top-5 comments, up from 47.7% five months earlier; a sharp drop on proprietary repos where project context is needed. Supply repository knowledge, scale review effort to PR complexity, dispatch models by PR characteristics, and monitor quality as models change.
  - Implication: review quality is a function of supplied context and routing, both of which need per-PR data to tune.

## Spec-driven development is the industry's answer to intent

- **GitHub Spec Kit / Kiro.** Structured spec → plan → tasks artifacts before implementation. Use it as a reference for what a spec gate must contain, not as a dependency.
  - Implication: a card's _Done means_ is the natural spec; the missing piece is executing it as checks, not writing more prose.

## A passing result is not a good result

- **AgentLens, _Revealing the Lucky Pass Problem in SWE-Agent Evaluation_ (arXiv 2605.12925).** Of 1,815 passing OpenHands trajectories, 10.7% are _Lucky Passes_: regression cycles, blind retries, missing verification, or verification ordered after implementation. Ranking by process quality moves model backends by up to five positions.
  - Implication: a run record storing only pass/fail cannot separate a solid run from a lucky one. Store which checks ran, in what order, and what regressed.
- **SWE-Bench Pro V2 (arXiv 2610.24206).** 480 of 731 tasks repaired or retired after agentic audits; frontier agents resolve up to 99.4% of the public split, while the Hard split spreads 52.9–98.0%.
  - Implication: public coding benchmarks have saturated at the top, so a vendor score cannot rank our options; our own cards are the only discriminating measure.

## Metrics are platform-specific

- **GitHub Copilot usage metrics API.** Reports per-repo agent PR activity for Copilot and partner agents. A bespoke fleet has no equivalent feed.
  - Implication: fleet-level outcome metrics are an unserved gap for small operators; the data is assemblable from webhooks plus the GitHub timeline.

## Observability conventions worth reusing

- **OpenTelemetry GenAI semantic conventions.** Standard attribute names for agent/model/tool spans, still in development. Borrow the names for a run record so a later export to an OTel backend is a mapping, not a rewrite.
- **Langfuse-class tools.** Strong at LLM-call tracing and cost, weak at the work item: they know no card, review round or merge. A fleet record should join to the work item, not replace tracing.
