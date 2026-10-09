# aivara-se agent configuration

{{REPO_PURPOSE}} is written in the repository's own `README.md`; this file is the entry point an agent reads
first, and it indexes the shared skills.

## Repository Structure
- `agents/` — one file per agent (root, mama, meme, mimi, momo): the role it owns and its boundaries.
- `skills/` — the organisation's skills, read by every agent through `skills.external_dirs`.
- `templates/AGENTS.md` — the donor entry file a repository copies when it adopts the convention.
- `README.md` — what is here, how it is consumed, and how a repository adopts it.

## Agent Skills
- `coding` — code quality rules a formatter cannot enforce (`skills/coding/SKILL.md`).
- `review` — how to review another agent's change, and what the verdict must contain.
- `testing` — what to test, where the tests live, and how to run them.
- `writing` — the rules for the documentation that ships with the code.

## House Rules
- ALWAYS keep `agents/` and `skills/` as the only two content trees; nothing here is a scaffold.
- Never leave a slot (`{{...}}`) unfilled in `templates/AGENTS.md`'s consumers; this repository's own file
  carries none.
- Never write a secret, a token, a host path or a personal name into this repository.
- ALWAYS change a skill here once, rather than copying it into a profile.

## Version Control
- `main` is the default branch; work lands through a pull request.
- A pull request asks the operator and one peer agent for review.

## Checks
```sh
grep -rn '{{' . --exclude-dir=.git
find skills -name SKILL.md | sort
head -4 skills/*/SKILL.md
```
