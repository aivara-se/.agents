# The `aivara-se` agent configuration

Every agent in this organisation reads the same instructions, and every repository hands them the same
text. That shared text lives here, once.

## Layout

```
README.md                 this file — what is here and how it is consumed
AGENTS.md                 the entry file for an agent working in this repository
agents/                   one file per agent: its identity, the role it owns and its boundaries
  root.md  mama.md  meme.md  mimi.md  momo.md
skills/                   the organisation's skills, read by every agent
  coding/SKILL.md  review/SKILL.md  testing/SKILL.md  writing/SKILL.md
  writing/resources/readme-template.md
templates/AGENTS.md       the donor entry file a repository copies when it adopts the convention
```

## How the agents consume it

A profile loads the skills through `skills.external_dirs`, pointing at the `skills/` directory of a
checkout of this repository (the checkout follows the usual convention: `~/github/aivara-se/.agents`).
A skill therefore changes once, here, and every agent reads the new text on its next turn.

The files under `agents/` are an agent's profile identity: one file per agent, and the text of that
profile's `SOUL.md`, which the agent loads on every turn. Each file is complete as it stands, so copying it
over the profile's `SOUL.md` loses nothing, and this repository is where the text is decided.

## How a repository adopts the convention

1. Copy `templates/AGENTS.md` to the repository root as `AGENTS.md`, and `skills/` to `.agents/skills/`
   in that repository. If the repository already has an `AGENTS.md`, **merge, do not overwrite**: keep its
   house rules, its procedures and its deploy note, and put the shared sections around them.
2. Fill every `{{UPPER_SNAKE_CASE}}` slot in the copy. The slots are `{{ORG}}`, `{{CONVENTION_VERSION}}`,
   `{{ADOPTED_FROM}}`, `{{REPO_PURPOSE}}`, `{{REPO_OVERVIEW}}`, `{{CURRENT_FOCUS}}`,
   `{{REPO_HOUSE_RULES}}`, `{{REPO_CHECK_COMMAND}}`, `{{REPO_CHECK_NOTES}}`, `{{DEFAULT_BRANCH}}`,
   `{{REVIEW_REQUEST_TARGETS}}`, `{{REPO_STRUCTURE}}`. No slot survives: an unfilled slot means the
   adoption is unfinished.
3. A repository's own sections sit above **Version Control**; everything from **Version Control** down is
   the convention and is not edited per repository.

## Adding or changing a skill

1. Create `skills/<skill-name>/SKILL.md`.
2. Add it to the skill index in `AGENTS.md` **in the same pull request**. A skill on disk and not in the
   index is invisible; a skill in the index and not on disk is a lie.
3. Front matter is exactly three keys: `name` (equal to the directory name), `description` (one sentence),
   `when-to-use` (the trigger in the reader's own words). Keep a skill under about 120 lines; past that it
   is either two skills or the detail belongs in `resources/`.
4. A skill stands on its own: it names no other file of the convention and points at no other skill. Where
   a rule needs a command, the skill names the concept and leaves the literal command to the repository.

## Checks

```sh
grep -rn '{{' agents skills --exclude-dir=.git   # must print nothing: only templates/ carries slots
find skills -name SKILL.md | sort           # must match the index in AGENTS.md, no more and no fewer
head -4 skills/*/SKILL.md                   # name, description, when-to-use in each
```
