---
name: product-briefs
description: Use when drafting a product idea brief for handover.
author: Thanish Nizam (mnmtanish), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
when-to-use: The operator describes a product idea, asks for a name, or asks for something to hand to the chief architect before a spec or any code exists.
metadata:
  hermes:
    tags: [product, brief, handover, naming, spec]
    related_skills: [writing, review]
---

# Product briefs

A brief hands an idea from the operator to the chief architect, who writes the spec. Everything the operator owns arrives decided or visibly open: a brief that makes the architect guess at a decision has moved the work, not done it.

Use it for an idea written up before any spec or code, for a name, or for something to hand to the architect. Not for the spec itself or edits to an existing product's documents: those follow the `writing` skill.

## Procedure

1. **Read the house rules first.** Take voice, capitalisation and vocabulary from `AGENTS.md` and `docs/PRODUCT.md`: the brief must read as if the organisation wrote it.
2. **Fix the vocabulary first.** Name both sides of a two-behaviour product near the top. Keep the product name and the behavioural terms separate, and say which is expensive to change.
3. **State what it is in one paragraph a stranger could repeat**, then who uses it, then the behaviour as numbered, tester-ready steps.
4. **Separate the parties:** the user (who cannot read the brief), the buyer, whoever holds the constraints. Mixing them loses both rules.
5. **Number the open questions** as decisions with their trade-off and what each answer changes; ask for a number and its unit, never a vague threshold.
6. **Give constraints and out-of-scope their own short, absolute sections:** a constraint the spec can ignore is not one.
7. **Close with v1's testable lines**, each naming an observable action and its result: they become the acceptance criteria and first tests.
8. **Write the file, attach it, summarise the shape**, and offer the handover channels as a numbered list, default first.

## Rules

- **Decided vs open is the spine.** Never bury a decision in prose or let an open question read as settled.
- **The operator answers in numbered batches:** one decision per line; a line with two is answered once and half-missed.
- **Write the rules down first.** Once idea and name are settled, the next artifact is the brief, not a prototype.
- **Naming is a step, not a favour:** ranked options, recommended first, one clause of why each (`references/product-naming.md`).
- **External actions need an explicit yes.** Sending mail, opening an issue or posting is offered, never done unasked; "draft it" is not permission to send. Never read another agent's mailbox or guess a peer's address: send only, after confirming it.
- **No stack, no roadmap, no org chart.** Tooling belongs in the architecture document.
- **Hold the operator's spelling.** A picked name keeps that spelling everywhere; behavioural terms stay lowercase and identical — two spellings become two code paths.

## Pitfalls

- A layout that arrives as an image is a decision: restate it, and flag it open when it conflicts with who uses the product.
- Acceptance lines describing intent ("the app is fun for children") are untestable and get dropped; write the behaviour ("a hand dragged across the keyboard produces no sound and no text").
- Do not settle the brief in chat only: it is a file the architect works from and needs a durable home.
