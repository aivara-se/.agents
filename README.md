# The `aivara-se` agent configuration

Every agent in this organisation reads the same instructions. The skills live here once and every agent reads them from here; the entry file a repository adopts lives in `aivara-se/.template`.

## Layout

```
README.md    this file — what is here and how it is consumed
AGENTS.md    the entry file for an agent working in this repository
agents/      one file per agent: the whole of its profile text
skills/      one directory per skill, each holding a SKILL.md
```

The tree is the index: a skill exists because its directory exists, so adding one edits nothing else.

## How the agents consume it

A profile loads the skills through `skills.external_dirs`, pointing at the `skills/` directory of a checkout of this repository (the checkout follows the usual convention: `~/github/aivara-se/.agents`). A skill therefore changes once, here, and every agent reads the new text on its next turn.

The files under `agents/` are an agent's profile identity: one file per agent, and the text of that profile's `SOUL.md`, which the agent loads on every turn. Each file is complete as it stands, so copying it over the profile's `SOUL.md` loses nothing, and this repository is where the text is decided.

## How a repository adopts the convention

`aivara-se/.template` holds the donor `AGENTS.md` and the steps that fill it. This repository ships the skills that file points at, and nothing else about the adoption.

## Adding or changing a skill

1. Create `skills/<skill-name>/SKILL.md`.
2. Front matter is exactly three keys: `name` (equal to the directory name), `description` (one sentence), `when-to-use` (the trigger in the reader's own words). Keep a skill under about 120 lines; past that it is either two skills or the detail belongs in `references/`.
3. A skill stands on its own: it names no other file of the convention and points at no other skill. Where a rule needs a command, the skill names the concept and leaves the literal command to the repository.
4. A skill's supporting files live in one of four directories beside its `SKILL.md` — the four the runtime reads: `references/` (a document the skill points at), `templates/` (a file to copy and fill), `scripts/` (code the skill runs), `assets/` (images and other blobs).

## Checks

```sh
grep -rn '{{' agents skills --exclude-dir=.git   # must print nothing
find skills -name SKILL.md | sort           # every skill on disk
head -4 skills/*/SKILL.md                   # name, description, when-to-use in each
```

