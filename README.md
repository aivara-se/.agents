# The `aivara-se` agent configuration

Every agent in this organisation reads the same instructions. The skills live here once. The entry file a repository adopts lives in `aivara-se/.template`.

## Layout

```
README.md    this file
AGENTS.md    the entry file for an agent working in this repository
agents/      one file per agent: the whole of its profile text; <name>/ holds its own documents and tools
skills/      one directory per skill, each holding a SKILL.md
scripts/     what maintains this repository, such as the prose gate
```

## How the agents consume it

A profile loads `skills/` through `skills.external_dirs`, pointing at a checkout of this repository at `~/github/aivara-se/.agents`. A skill changes once, here, and every agent reads the new text on its next turn.

Each file under `agents/` is an agent's identity: one file per agent, copied over that profile's `SOUL.md`.

## The skill archive

`agents/<name>/skills/` holds the skills that profile owns: the ones it wrote, and the stock files it edited. Nothing reads it.

It exists for a rebuild. Restore with `cp -an agents/<name>/skills/. /root/.hermes/profiles/<name>/skills/`, which adds back only what is missing and overwrites nothing. The sync keeps it current, so an edit there is undone rather than published.

## Adding or changing a skill

Follow `skills/writing/references/writing-skills.md`.

## Checks

The commands an agent runs here are in `AGENTS.md`.
