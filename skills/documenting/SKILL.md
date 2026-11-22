---
name: documenting
description: Always follow these guidelines when writing or changing documents
---

Write the smallest document the task needs. Keep one fact in one place. A document that restates another is wrong even when both are true. The writing rules apply to every project document, including ones this skill does not name.

## Where a fact lives

- `README.md` — the entry point: a short summary, how to run it, examples, and checks.
- `docs/adrs/*.md` — major decision and its consequences.
- `docs/SPEC8N.md` — the authoritative direction, product behaviour, and system shape.
- `docs/DESIGN.md` — the design system, brand styles, colours, typography, and spacing.

The spec owns behaviour and mechanism. `docs/DESIGN.md` owns visual tokens. An ADR owns the decision and its cost. Never restate another file's fact. No document carries history, except the ADR, which keeps what it displaced.

## Writing

- Answer first: the first line is the answer, the verdict, or the ask. No preamble.
- One instruction per sentence, in the imperative, active voice, present tense.
- A paragraph is six sentences or less. A noun cluster is three words or less.
- One term for one item, every time. Choose the simplest and short common word.
- The rules bind prose only. Code, paths, commands, and quoted output keep their form.

When a change makes a document untrue, fix it in the same change and `git grep` the tree for the old term.

## README

Every application and shared library has one at its root. Use these sections, in this order:

- `# <Name>`: one or two sentences on what it is and who it is for. No stack list.
- `## Setup`: the shortest sequence that gets it running, and anything that must be true first.
- `## Usage`: the simplest happy case as a runnable example, not a complete guide.
- `## License`: the license under which the project is released (use MIT unless explicitly stated otherwise).

Never add history, a roadmap, an organisation chart, an ADR list, or a stack list. Link to `docs/SPEC8N.md` and `docs/DESIGN.md`; do not restate them.

## docs/SPEC8N.md

`SPEC8N` is `specification` with the eight middle letters omitted, one page, 500 words or less.

Use three sections, in this order:

- `## Direction`: the operator's goal, the constraints the operator sets, the scope, and what is deliberately later. Write nothing about behaviour here.
- `## Requirements`: what it is, who it serves, the behaviour and its rules, the limits it must never break, and scope.
- `## Architecture`: how it works, dependencies, infrastructure, and checks. Name the choices, not the stack.

The spec stands alone. Cite an ADR only when the decision changes what the reader must do. Never link to `README.md`, `docs/DESIGN.md`, or code. No history, roadmap, changelog, status, or version number.

## docs/DESIGN.md

Every project with a UI has one at `docs/DESIGN.md`.

Follow the designmd.ai format, reduced to three sections:

- `## Colours`: each token with its hex code and where it is used.
- `## Typography`: each family, size, weight, and line height with where it is used.
- `## Spacing`: the base unit and the scale, with where each step is used.

Use measured values. Mark a value measured at build until it is measured on the surface it is used on. Never signal a state by colour alone; pair it with shape, weight, or a word. No components, elevation, or guidelines: those live in the code.

## docs/adrs/*.md

One decision per record, at `docs/adrs/NNN-<slug>.md`. Read the ADR it extends or overrides first.

- Context sets out the forces and the numbers. Decision picks one. Consequences say what it costs, including the cost that stays.
- Keep it to 20–40 lines. Cite measurements, not adjectives where it is possible. Never use vague terms like "fast" or "good".
- It stands alone: no links to a living document or to code. It cites only earlier ADRs, numbered in dependency order.
- Name the property, not a brand, and name no version. State what the code must hold, not how the current layout works.
- It is immutable once accepted. A record in review is rewritten in place. Only the operator can approve an edit to an accepted record.
- Quote a retired clause word for word in Consequences. An override names the clauses it replaces; everything else stands.
- A record the tree never implemented is overridden the same way, and the new record says the older never ran.
