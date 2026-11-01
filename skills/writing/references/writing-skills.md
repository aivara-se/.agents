# Skills

An agent reads a skill before it acts. Every line competes with the task it helps, so a skill is a rule set, not an essay.

## The file

- `skills/<name>/SKILL.md`, where the directory name is the skill's name.
- Front matter is five lines: `---`, `name`, `description`, `when-to-use`, `---`.
- `description` is one sentence. `when-to-use` is the trigger in the reader's words, not the topic.
- 900 words or less. Past that it is two skills, or the detail belongs in `references/`.

## A rule

- One rule per bullet, 30 words or less.
- The reason is a clause, not a paragraph.
- The story that produced the rule belongs to the commit. A rule that needs the story is not yet a rule.
- Load-bearing rules go first in their section. Attention thins toward the end.
- Delete what a formatter or linter enforces, or move it into that tool.

## One concern, no restatement

- A skill owns one concern and never restates another's rule. Name the owner and stop.
- The reference runs one way: the skill covering the situation names the one covering the craft, never the reverse.
- Quote a command where the skill can name it. Where only the repository knows it, say how to find it.

## Where a skill belongs

- A skill every agent reads is a convention: the pull request, the board, the register. It lives here, stated once.
- A skill one agent runs is craft: a service, a framework, a measurement. It lives in that profile until a second agent needs it.
- A private skill never states an organisation fact. Point at the shared skill that owns it.

## One job, one skill

- Two skills covering one job are a conflict even when neither contradicts the other: the reader takes whichever loads.
- Where two agents wrote one procedure, the shared skill survives and the private copy keeps only what its role adds.
- Check a skill that names a repository, a service or a path before you write it. A rename falsifies every skill carrying the old word.
- Room to spare is part of the file. A skill at its ceiling pushes the next lesson into `references/`.

## Supporting files

`references/` (a document the skill points at), `templates/` (a file to copy and fill), `scripts/` (code the skill runs), `assets/` (blobs). A reference is a document, held to the same length rule, pointed at from the rule it supports.

## Checks

`bun run scripts/check-prose.ts` in `aivara-se/.agents` enforces the budgets. A skill that fails it is not finished.
