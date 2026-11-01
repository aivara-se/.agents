# Outside evidence for instruction compression

Measured results, not opinions. Quote one of these with its number; a claim without a number is the thing this file exists to replace.

## Instruction density

- **IFScale, arXiv 2507.11538** — 500 simultaneous keyword-inclusion instructions: the best of 20 frontier models scores **68%**. Degradation is graded, and the bias is toward **earlier** instructions. So the order of a rule list is part of its meaning, and a finite budget is real.
- **Practitioner budget, ~150–200 instructions** per context, of which a coding agent's own system prompt already spends about 50 (HumanLayer, repeated in the CLAUDE.md literature). Count _rules_, not words: a 40-bullet skill with clauses is at the ceiling.
- **Anthropic, Claude Code memory docs** — instructions are context, not configuration: "the more specific and concise your instructions, the more consistently Claude follows them". Multi-step procedures belong in skills; always-on files hold facts.
- **Anthropic, context engineering** — the goal is "the smallest set of high-signal tokens that still maximizes the probability of the desired output"; a bloated always-loaded file competes with the task.
- **HumanLayer** — keeps the always-loaded file under **60 lines**, and wraps sections in `<important if="...">` so one fires only when it applies. Conditions and scoping beat more prose.

## Plain language

- **GOV.UK** — plain English is mandatory for all its content, and the research behind it found **80% prefer sentences in clear English**, with preference _increasing_ with the reader's expertise: specialists want the answer fast, not decorated. Long words, nominalisations (`-ion`, `-ment`) and jargon are the named causes of dilution.
- **plainlanguage.gov, top 10** — state the major point first; one idea per paragraph; active voice; short sentences; omit unneeded words; keep subject and verb close. The first two are structural.
- **Google developer documentation style guide** — conversational without being frivolous, don't pre-announce, second person, active voice, sentence-case headings, lists for sequences.

## Enforcement

- **Vale** (vale.sh) lints prose in CI as a formatter lints code, and ships a Google style package. Take the idea, not necessarily the tool: a ~50-line script in the repository's own language, run by its existing gate, fits a repository that forbids a second toolchain.
- Checks worth automating: words per file, words per bullet, banned openers and filler (`it is worth noting`, `in order to`, `simply`, `just`, `note that`), and duplicate sentences across skills.

## What not to import

- Amazon's six-page narrative and Bezos's slide ban are about _replacing_ slides with prose — the opposite problem.
- Docs-as-code generators and Vale's full style packages: more machinery than a 700-word file needs.
