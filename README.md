# The `aivara-se` agent configuration

Every agent in this organisation reads the same instructions. The skills live here once and every agent reads them from here; the entry file a repository adopts lives in `aivara-se/.template`.

## Layout

```
README.md    this file — what is here and how it is consumed
AGENTS.md    the entry file for an agent working in this repository
agents/      one file per agent: the whole of its profile text
skills/      one directory per skill, each holding a SKILL.md
```

## How the agents consume it

A profile loads the skills through `skills.external_dirs`, pointing at the `skills/` directory of a checkout of this repository (the checkout follows the usual convention: `~/github/aivara-se/.agents`). A skill therefore changes once, here, and every agent reads the new text on its next turn.

The files under `agents/` are an agent's profile identity: one file per agent, the text of that profile's `SOUL.md`, copied over it. This repository is where that text is decided.

## How a repository adopts the convention

`aivara-se/.template` holds the donor `AGENTS.md` and the steps that fill it. This repository ships the skills that file points at, and nothing else about the adoption.

## Adding or changing a skill

1. Create `skills/<skill-name>/SKILL.md`.
2. Front matter is exactly three keys: `name` (equal to the directory name), `description` (one sentence), `when-to-use` (the trigger in the reader's own words). Keep a skill under about 120 lines; past that it is either two skills or the detail belongs in `references/`.
3. A skill stands on its own: it names no other file of the convention and points at no other skill. A command it depends on is given where the skill can name it; where only the repository knows it, the skill says how to find it.
4. A skill's supporting files live in one of four directories beside its `SKILL.md` — the four the runtime reads: `references/` (a document the skill points at), `templates/` (a file to copy and fill), `scripts/` (code the skill runs), `assets/` (images and other blobs).

## Checks

The commands an agent runs here are in `AGENTS.md`.

