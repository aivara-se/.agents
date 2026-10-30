---
name: instruction-audit
description: "Use when an instruction set is too long to act on."
version: 1.0.0
author: MeMe
license: MIT
when-to-use: The operator asks to make agents, their messages, or their documents shorter, clearer or simpler — or a rule corpus (AGENTS.md, SKILL.md, prompts) has grown past what anyone reads.
metadata:
  hermes:
    tags: [instructions, compression, agents-md, skills, prose, audit, readability]
    category: software-development
    related_skills: [writing, hermes-agent-skill-authoring, review]
---

# Instruction audit

An instruction set is judged by what an agent does differently, not by how thorough it reads. Density costs adherence: every rule added past the budget is followed less reliably than the ones before it. So the work is measure, cut, and prove the cut — never "polish the wording".

## When to Use

- The operator says the agents, their messages or their documents are too long, wordy or hard to read.
- A rule corpus has grown past what anyone reads: an AGENTS.md, a skill, a prompt, a set of SOUL files.
- A skill is over its budget, or the same rule appears in more than one file.

## Procedure

1. **Read the whole corpus before judging it.** Every file at full length, not a grep. Load `writing` for the rules the documents themselves follow — the audit applies them. Count the files and words; a set that quotes its own length badly is the first finding.
2. **Measure, do not eyeball.** `scripts/measure-prose.py <dir>` prints words per file, rules per file, words per bullet (average and worst), the share of sentences past 40 words, and duplicate lines between near-identical files. Numbers are what makes the proposal arguable; adjectives are not.
3. **Name the failure modes you find, by instance.** The four that recur: a rule written as an incident narrative (the story is longer than the rule it teaches); a megabullet (a paragraph inside a bullet, so nothing in it can be cited or deleted); duplication across files that are "complete on their own", which then drifts one copy at a time; and a budget counted in lines on markdown that never wraps.
4. **Check what the gate enforces.** A formatter, linter or CI script already checking the corpus is the cheap half of the fix. A budget nobody measures is exactly the drift being audited.
5. **Attach a source and a number to every outside claim.** "Best practice says" is not evidence. `references/evidence.md` holds the measured outside practice: adherence budgets, instruction-density results, plain-language research, linters.
6. **Write the proposal before touching a file**: findings with the numbers, the one passage that best shows the disease rewritten by hand as the target style, then the decisions the operator has to make — numbered, each with a recommended default. He decides in batches and expects the rules agreed before anything is built, so the corpus is not edited in this pass.

## The cut

- One rule per bullet, 25 words or less. The reason survives as a subordinate clause; the narrative goes to `references/` beside the rule, or to the commit, where the story can be as long as it likes.
- A lookup that repeats — who reviews what, which command for which case — is a list, not a paragraph.
- Put the load-bearing rule first in its section: adherence falls off toward the end of a long context.
- Delete what a tool already enforces, or move it into that tool.
- Keep the rule and cut the evidence only when the rule stands alone. Where the evidence is the point (a fixture bug nobody would guess), shrink the rule to an imperative and move the case, not delete it.
- **Split judgement from presentation.** What counts — which verdict, which finding, what is in scope — stays with the skill that decides it; how the result reads moves to the document that shapes writing. Each file opens by naming the other, and neither carries the other's half.

## After the operator agrees

- Budgets live in two places or neither is true: the `writing` skill states the number, and a script enforces that same number. Change one and change the other.
- Compress by moving, not deleting: a rule that needs its story gets the imperative at 30 words plus the case in `references/`. Delete only the rule that tooling already enforces or that no future agent could act on.
- A file that must stand alone — an agent's identity — is compressed in place, never replaced by a link to a shared file.
- Prove the gate by breaking it: a rule over the limit, a sentence over the limit, a file over budget, a sentence repeated across two files, a filler word. A check never seen to fail is a check that may be checking nothing. `references/prose-gate.md` has the checks, the traps and the probe recipe.
- Land it as a pull request like any other change, and name in the body what the gate cannot reach — a file the write rules block, a line the shell still checks.

## Pitfalls

- **Lines are the wrong unit.** Markdown here never hard-wraps, so an 84-line file can hold 2,400 words. Budget in words; a "keep it under 120 lines" rule is how a file grows to 13 KB while passing its own check.
- **A gate that has not been probed is a guess.** Write the failing case yourself and watch the script exit 1 before claiming the corpus is protected.
- **Do not edit the corpus in the analysis pass.** The operator has not chosen the depth yet, and the files under review belong to a repository that takes its changes through a pull request. A dirty clone is neither a proposal nor a deliverable.
- **Duplication in files that must stand alone is by design.** Agent identity files are copied whole, so they repeat the organisation's facts; compress each copy, do not replace them with links to a fifth file. Where a shared rule genuinely has one home, say which file and make the others one line.
- **A rule that has been broken is not automatically a rule that earns its place.** Advice that only fits the incident that produced it belongs in the incident's commit; testing whether a future agent could act on the line without the story is the cut.

## Done

Every claim in the proposal is backed by a number the script reproduces, the sample rewrite shows the target style on real text, and the decisions are numbered with a recommendation. The operator can answer in one message and the rules can then be written down.
