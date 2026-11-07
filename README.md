# The `aivara-se` agent configuration

Every agent in this organisation reads the same instructions. The skills live here once. The entry file a repository carries is `aivara-se/.github/docs/ENTRY.md`.

## Layout

```
README.md    this file
AGENTS.md    the entry file, identical to the standard
agents/      one file per agent: the whole of its profile text; <name>/ holds its own documents and tools
skills/      one directory per skill, each holding a SKILL.md
scripts/     what maintains this repository, such as the prose gate
```

## How the agents consume it

A profile loads `skills/` through `skills.external_dirs`, pointing at a checkout of this repository at `~/github/aivara-se/.agents`. A skill changes once, here, and every agent reads the new text on its next turn.

Each file under `agents/` is an agent's identity: one file per agent, copied over that profile's `SOUL.md`.

## Each profile's own skills

`agents/<name>/skills/` holds the skills that profile owns: the ones it wrote, and the stock files it edited.

A profile loads them through `skills.create_dir`, which points here. This directory is their only home: a skill an agent saves lands here and is live at once. The shared skills arrive separately, through `skills.external_dirs`.

A stock Hermes skill stays in the profile. Only what this agent authored or changed lives here.

## House rules

- Never write a secret, a token, a host path or a personal name into this repository.
- Change a skill here once, rather than copying it into a profile or a repository. A profile's own skills are the exception: they live under `agents/<name>/skills/` and load from there. A host path or a personal name in them is that profile's. A secret is never exempt.
- An agent file is complete on its own: copy it over `SOUL.md` and nothing is lost.
- `AGENTS.md` is never edited here. A rule change is a pull request to `aivara-se/.github/docs/ENTRY.md`.

## Adding or changing a skill

Follow `skills/writing/references/writing-skills.md`.

## Checks

```sh
bun fmt --no-script --check .
bun run scripts/check-prose.ts
find skills -name SKILL.md | sort                # every skill on disk
head -4 skills/*/SKILL.md                        # name, description, when-to-use in each
```

The same commands run in `.github/workflows/validate.yml`, whose job is named `validate`. The `agents` job beside it proves `AGENTS.md` is the standard.
