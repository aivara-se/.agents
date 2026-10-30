# Outside evidence for instruction compression

Measured results, not opinions. Quote one of these with its number; a claim
without a number is the thing this file exists to replace.

## Instruction density

- **IFScale, arXiv 2507.11538** — 500 simultaneous keyword-inclusion
  instructions: the best of 20 frontier models scores **68%**. Degradation is
graded, and the bias is toward **earlier** instructions. Consequence: the
  order of a rule list is part of its meaning, and a finite budget is real.
- **Practitioner budget, ~150–200 instructions** per context, of which a
  coding agent's own system prompt already spends about 50 (HumanLayer,
  repeated in the CLAUDE.md literature). Consequence: count *rules*, not
  words, when deciding what the agent can still act on; a 40-bullet skill
  with clauses is already at the ceiling.
- **Anthropic, Claude Code memory docs** — instructions are context, not
  configuration: "the more specific and concise your instructions, the more
  consistently Claude follows them". Multi-step procedures belong in skills,
  always-on files hold facts.
- **Anthropic, context engineering** — the goal is "the smallest set of
  high-signal tokens that still maximizes the probability of the desired
  output"; a bloated always-loaded file competes with the task for attention.
- **HumanLayer** — keeps the always-loaded file under **60 lines**, and wraps
  sections in `<important if="...">` so a section only fires when it applies.
  Long files get treated as "may or may not be relevant" section by section.
  Consequence: conditions and scoping beat more prose.

## Plain language

- **GOV.UK** — plain English is mandatory for all of its content, and the
  research behind it found **80% prefer sentences in clear English**, with
  preference *increasing* with the reader's expertise: specialists want the
  question answered fast, not decorated. Long words, nominalisations
  (`-ion`, `-ment`) and jargon are the named causes of dilution.
- **plainlanguage.gov, top 10** — state the major point first; one idea per
  paragraph; active voice; short sentences; omit unneeded words; keep subject
  and verb close. The first two are structural and matter more than vocabulary.
- **Google developer documentation style guide** — be conversational without
  being frivolous, don't pre-announce, second person, active voice, sentence
  case headings, lists for sequences.

## Enforcement

- **Vale** (vale.sh) lints prose in CI the way a formatter lints code; a
  Google style package exists. Take the idea, not necessarily the tool: a
  ~50-line script in the repository's own language, run by its existing gate,
  fits a repository that forbids a second toolchain. What matters is that the
  budget is checked on every change.
- Checks worth automating on an instruction corpus: words per file, words per
  bullet, banned openers and filler (`it is worth noting`, `in order to`,
  `simply`, `just`, `note that`), and duplicate sentences across skills.

## What not to import

- Amazon's six-page narrative and Bezos's slide ban are about *replacing*
  slides with prose — the opposite problem.
- Docs-as-code site generators and Vale's full style packages: more machinery
  than a 700-word file needs.
