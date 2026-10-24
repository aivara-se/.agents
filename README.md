# The `aivara-se` agent configuration

Every agent in this organisation reads the same instructions. The skills live here once, and the entry file a repository adopts lives in `aivara-se/.template`.

## Layout

```
README.md    this file
AGENTS.md    the entry file for an agent working in this repository
agents/      one file per agent: the whole of its profile text
skills/      one directory per skill, each holding a SKILL.md
```

## How the agents consume it

A profile loads `skills/` through `skills.external_dirs`, pointing at a checkout of this repository at `~/github/aivara-se/.agents`. A skill changes once, here, and every agent reads the new text on its next turn.

The files under `agents/` are an agent's identity: one file per agent, copied over that profile's `SOUL.md`.

## Adding or changing a skill

The procedure is `skills/writing/references/writing-skills.md`: the file, the rule, the supporting directories.

## Checks

The commands an agent runs here are in `AGENTS.md`.
