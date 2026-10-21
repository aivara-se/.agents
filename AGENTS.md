# aivara-se agent configuration

Who each agent in this organisation is, and the procedures they all work by. `README.md` says how the two reach a profile.

## Layout

- `agents/` — one file per agent: the whole of that profile's `SOUL.md`.
- `skills/` — one directory per skill, each holding a `SKILL.md`.
- `README.md` — what is here, how it is consumed, and how a skill is written.

The tree is the index. A new skill is a new directory with a `SKILL.md`, and every `SKILL.md` under `skills/` is read by every agent. Nothing in this file lists a skill.

## House Rules

- The entry file a repository adopts is `aivara-se/.template`, never this repository's own `AGENTS.md`.
- Never leave a slot (`{{...}}`) unfilled in a copy of the template; no slot exists in this repository.
- Never write a secret, a token, a host path or a personal name into this repository.
- ALWAYS change a skill here once, rather than copying it into a profile or a repository.
- An agent file is complete on its own: copy it over `SOUL.md` and nothing is lost.

## Version Control

- `main` is the default branch; work lands through a pull request.
- A pull request asks the operator and one peer agent for review.

## Checks

```sh
grep -rn '{{' agents skills --exclude-dir=.git   # must print nothing
find skills -name SKILL.md | sort                # every skill on disk
head -4 skills/*/SKILL.md                        # name, description, when-to-use in each
```

