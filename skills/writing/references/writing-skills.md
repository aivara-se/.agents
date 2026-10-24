# Skills

A skill is read by an agent before it acts. Every line competes with the task it is meant to help, so a skill is a rule set, not an essay.

## The file

- `skills/<name>/SKILL.md`, where the directory name is the skill's name.
- Front matter is five lines: an opening `---`, `name`, `description`, `when-to-use`, a closing `---`.
- `description` is one sentence. `when-to-use` is the trigger in the reader's words, not the topic.
- 700 words or less. Past that it is two skills, or the detail belongs in `references/`.

## A rule

- One rule per bullet, 30 words or less.
- The reason is a clause, not a paragraph: "Pin one clause per case — a happy path plus a negative leaves the rest free to be deleted."
- The story that produced the rule belongs to the commit. A rule that needs the story is not yet a rule.
- Load-bearing rules go first in their section: attention thins toward the end.
- Delete what a formatter or linter enforces, or move it into that tool.

## One concern, no restatement

- A skill owns one concern and never restates another's rule: name the skill that owns it and stop.
- The reference runs one way — the skill that covers the situation names the one that covers the craft, never the reverse.
- A command the skill depends on is quoted where the skill can name it; where only the repository knows it, say how to find it.

## Supporting files

Four directories beside the `SKILL.md`, the ones the runtime reads: `references/` (a document the skill points at), `templates/` (a file to copy and fill), `scripts/` (code the skill runs), `assets/` (images and other blobs).

A reference is a document, held to the same length rule, and pointed at from the rule it supports.

## Checks

`bun run scripts/check-prose.ts` in `aivara-se/.agents` enforces the budgets. A skill that fails it is not finished.
