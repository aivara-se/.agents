# The `aivara-se` agent configuration

Every agent in this organisation reads the same instructions. The skills live here once, and the entry file a repository adopts lives in `aivara-se/.template`.

## Layout

```
README.md    this file
AGENTS.md    the entry file for an agent working in this repository
agents/      one file per agent: the whole of its profile text; <name>/ beside it holds its own documents and tools
skills/      one directory per skill, each holding a SKILL.md
scripts/     what maintains this repository, such as the prose gate
```

## How the agents consume it

A profile loads `skills/` through `skills.external_dirs`, pointing at a checkout of this repository at `~/github/aivara-se/.agents`. A skill changes once, here, and every agent reads the new text on its next turn.

The files under `agents/` are an agent's identity: one file per agent, copied over that profile's `SOUL.md`.

## The skill archive

`agents/<name>/skills/` holds the skills that profile owns: the ones it wrote, and the stock files it edited. Nothing reads it — a profile loads its own `skills/` directory, not this tree.

It exists for a rebuild. Restore with `cp -an agents/<name>/skills/. /root/.hermes/profiles/<name>/skills/`, which adds back only what is missing and overwrites nothing. The sync keeps it current, so an edit there is undone rather than published.

## Adding or changing a skill

The procedure is `skills/writing/references/writing-skills.md`: the file, the rule, the supporting directories.

## Checks

The commands an agent runs here are in `AGENTS.md`.
