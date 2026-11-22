# Specification

## Direction

Aivara runs five agents: MaMa the architect, MeMe the engineer, MiMi the innovator, MoMo the adversary, and Root the enabler. Each needs the same shared skills and an identity that survives a rewrite, and copying those by hand lets the copies drift. This repository is their single home. The scope is the shared skills and one profile per agent. What belongs to one project stays in that project: its spec, its design, and its code. Deferred by decision: per-agent tools, and any profile that does not join the fleet.

## Requirements

It serves every agent in the organisation, and the operator who maintains them.

- One profile per agent, complete on its own: copied over `SOUL.md`, nothing is lost.
- One copy of each shared skill. A skill changes once here, and every agent reads the new text on its next turn.
- `AGENTS.md` is the organisation's entry file, copied unchanged from `aivara-se/.github`. It is never edited here.
- The shared skills and profiles carry no project-specific fact.

Never break: no secret, token, or host path in the repository; no profile that does not join the fleet; no rule that restates another file; no history, roadmap, or version number.

## Architecture

A Bun-managed repository whose only content is Markdown. `agents/<name>/SOUL.md` holds one profile, `skills/<name>/SKILL.md` holds one shared skill, and `AGENTS.md` is the entry file.

A profile loads the shared skills through `skills.external_dirs`, pointing at a checkout of this repository, and its own skills through `skills.create_dir`. The repository does not build or run; it is read.

The pull request workflow runs the formatter and calls the organisation's checks. `validate-agents` proves `AGENTS.md` is the standard, `validate-docs` proves this specification, and `validate-config` proves the repository's settings. Each is one job in the `validate` workflow.
