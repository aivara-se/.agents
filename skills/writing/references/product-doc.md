# Product document

The product document is the one authoritative place for user-facing behaviour. Interface and visual decisions go in the design document, technical design in the system document; the product document links to them and does not restate them.

## What it holds, in the order a reader needs it

- One paragraph: what it is, who the user is, what it does not do.
- The behaviours the product turns on, named. When it turns on a distinction — something answered, something ignored — name both and say the pair is the product.
- Each behaviour, with its rules and its numbers.
- The screen or interface as behaviour: what happens, not what it looks like. Defer pixels to the design document.
- Constraints: what it must never do (network, accounts, prompts, errors), and any it cannot meet alone.
- Scope: what v1 does not do. Then acceptance: what v1 must do, each item measurable.
- The name: what the name has to do, not the name itself.

## Rules

- A number that cannot be measured yet gets a provisional value, marked provisional, and the thing that will freeze it — a measured session, a spike. Never invent a number and mark it decided.

## Pitfalls

- Do not write the document in the voice of an existing document in the repository. Long-form documents drift past the length this skill allows; write from the rules, not from the neighbour.
- A constraint the product cannot meet alone is written with the step the user or the platform must take, and the document says the promise holds only then. Do not promise it falsely.
- A promise tied to a mechanism breaks when the mechanism changes. When a platform step is swapped, re-read every document that named it and restate each promise to what the new mechanism can deliver. Trimming the promise is part of the change, and it touches every document that named the old one, not just the open one.
- Every acceptance item must be checkable by someone other than its author: a time, a count, a replayable input trace.
