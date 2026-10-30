---
name: product-briefs
description: Use when drafting a product idea brief for handover.
version: 0.1.0
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

A brief hands an idea from the operator to the chief architect. It is not the spec and it is not a proposal: the chief architect writes the spec, and everything the operator owns arrives either decided or visibly open. A brief that makes the chief architect guess at an operator decision has moved the work rather than done it.

## When to Use

- The operator describes a product idea and wants it written up before a spec or any code exists.
- The operator asks for a name, or for more names, for something being built.
- The operator asks for something to hand to the chief architect (or another peer agent) to expand into a spec.
- Don't use for: writing the spec itself, or a change to an existing product's documents — that is the chief architect's artifact and follows the `writing` skill.

## Procedure

1. **Read the house rules before writing a line.** Open the repository's `AGENTS.md` and its `docs/PRODUCT.md` (or the equivalent product document) and take the voice, the capitalisation and the vocabulary from there. The brief must read as if the organisation already wrote it; your own taste is not the standard.
2. **Fix the vocabulary first.** When the product turns on two opposite behaviours, name both and put the pair near the top of the brief. A spec with no word for its own core mechanic drifts within a paragraph. Keep the product name and the behavioural terms separate, and say which of them is expensive to change later.
3. **State what it is in one paragraph a stranger could repeat**, then who uses it, then the behaviour as numbered steps a tester could follow with no product knowledge.
4. **Separate the parties.** The user (who cannot read the brief), the buyer, and whoever holds the constraints are three different people. "The child cannot read" is a product rule; "the parent hands over the device" is a different one; mixing them loses both.
5. **Number the open questions.** Keep them as decisions with their trade-off, not requests for permission, and say what the answer changes. Where a question needs a threshold, ask for the number and say what it is measured against; "what counts as deliberate input" is not answerable, "minimum gap between presses, picked from real finger timing" is.
6. **Constraints and out-of-scope get their own short, absolute sections.** A constraint the spec can ignore is not a constraint.
7. **Close with what v1 has to do** — lines that are testable before the product exists, each naming an observable action and its result. These become the acceptance criteria and the first tests.
8. **Deliver the file and the shape.** Write the brief to a file, attach it, and summarise the structure in a few lines. Offer the handover channels as a numbered list (send it yourself, open an issue, hand it over directly) with a recommended default first.

## Rules

- **Decided vs open is the spine.** Never bury an operator decision inside prose, and never let an open question read as settled. The chief architect's job is to expand what is decided, not to author the decisions.
- **The operator answers in numbered batches**, so anything you want answered comes back to them as a numbered list, one decision per line. A question that hides two decisions in one line is answered once and half-missed.
- **Write the rules down before anything is built.** When the idea and the name are settled, the next artifact is the written brief, not a prototype; the operator expects the agreement recorded first.
- **Naming is a step, not a favour**: ranked options, recommended one first, one clause of why each. See `references/product-naming.md`.
- **External actions need an explicit yes.** Sending mail, opening an issue, or posting to any channel is offered as an option and never done unasked. One "draft it" is not permission to send it.
- **Never read another agent's mailbox, and never guess a peer's address.** Send only, and confirm the address before the first send.
- **No stack, no roadmap, no org chart.** The brief says what the product does and what it must decide; tooling choices belong in the architecture document, later.
- **Hold the operator's spelling.** A name the operator picked stays spelled that way everywhere, and behavioural terms stay lowercase and identical across every document — a term that appears in two spellings will appear in two code paths.

## Pitfalls

- A brief that lists features without fixing the vocabulary leaves the spec to coin its own terms, and the code follows the spec. Name the mechanic first.
- Credit the source of every external claim. A trademark or availability conflict recalled from memory is stated as "verify before use"; presenting a recollection as a checked fact is worse than saying nothing.
- A layout or UI decision that arrives as an image is a decision, not an illustration. Read it, restate it in the brief, and flag it as an open question when it conflicts with who actually uses the product.
- Acceptance lines that describe good intent ("the app is fun for children") are untestable and will be dropped. Write the observable behaviour instead ("a hand dragged across the keyboard produces no sound and no text").
- Do not settle the brief in the chat only. It is a file the chief architect works from, and it needs a durable home before the spec exists.
