# The prose gate

A script that fails a pull request when the corpus outgrows its budget. A budget without a gate is the drift being audited.

## What it checks

- **Words per file**, against path patterns: skill 900, reference 750, an agent's own document 500, agent file 280, root document 400. Markdown matching no pattern is an error, not a pass — otherwise a new directory escapes silently.
- **Words per rule**: a bullet or numbered item in a `SKILL.md` is 30 words or less.
- **Words per sentence**: 25, everywhere. This is the check that catches the megabullet.
- **Filler**: a short banned list — simply, just, note that, in order to, leverage — scanned per line.
- **Repeated sentence**: ten words or more, appearing in two skills. Both load into one context, so the copy is the one that drifts.

Print `file:line — message` and exit 1; a CI runner renders that as an annotation on the diff.

## Traps

- **Count the body, not the file.** Strip `^---\n[\s\S]*?\n---\n` first, or every file carries a constant that makes the budget meaningless.
- **Split sentences per line, after dropping headings.** Joining lines and splitting on `.!?` glues a heading to the sentence below it, so both checks miss it.
- **Strip inline code and quoted text before the banned-word scan**, or the rule that names a filler word flags itself.
- **A budget is stated twice**: the writing skill names the number, the script enforces it. Change one and the other is a lie.
- **A file matching no budget is a failure**, not a pass.

## Probe it

For every check, write the smallest case that must fail and read the exit code. A probe under the limit passes and looks like proof:

- a 31-word bullet, a 26-word sentence, a 901-word skill, a sentence copied from another skill, one banned word.

Delete the probe after use. A gate that has never exited 1 is a gate nobody should trust.
