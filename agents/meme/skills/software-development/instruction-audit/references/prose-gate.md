# The prose gate

A script that fails a pull request when the corpus outgrows its budget. Budgets without a gate are the drift being audited.

## What it checks

- **Words per file**, against a table of path patterns: skill 700, reference 600, agent file 260, root document 400. Markdown matching no pattern is an error, not a pass — otherwise a new directory escapes the gate silently.
- **Words per rule**: a bullet or numbered item in a `SKILL.md` is 30 words or less.
- **Words per sentence**: 35, everywhere. This is the check that catches the megabullet: a line that never wraps and never ends.
- **Filler**: a short banned list — simply, just, note that, in order to, leverage — scanned per line.
- **Repeated sentence**: any sentence of ten words or more appearing in two different skills. Both load into one context, so the copy is the one that drifts.

Print `file:line — message` and exit 1; a CI runner renders that as an annotation on the diff.

## Traps

- **Count the body, not the file.** Strip `^---\n[\s\S]*?\n---\n` first, or every file carries a constant that makes the budget meaningless.
- **Split sentences per line, after dropping headings.** Joining lines with a space and splitting on `.!?` glues a heading to the sentence below it, so both the duplicate and the length check miss it: the gate goes green while checking nothing.
- **Strip inline code and quoted text before the banned-word scan**, or the rule that names a filler word flags itself.
- **A budget is stated twice.** The writing skill names the number and the script enforces it; change one and the other is a lie.
- **A file matching no budget is a failure**, not a pass.

## Probe it

For every check, write the smallest case that must fail, run the gate and read the exit code. A probe that stays under the limit passes and looks like proof:

- a 41-word bullet, a 40-word sentence, an 831-word skill, a sentence copied from another skill, one banned word.

Delete the probe after use. A gate that has never exited 1 is a gate nobody should trust.
