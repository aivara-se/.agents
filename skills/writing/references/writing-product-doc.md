# Product document

The one authoritative place for user-facing behaviour. Interface and visual decisions go in the design document, technical design in the system document. Link to them; do not restate them.

## Before the first line

Settle three forks, or the draft is a rewrite:

- **Who uses it, and who runs it.** An internal tool and a public product share a shape, not a promise.
- **One deployment or two.** A hosted service beside a self-hostable one carries a parity promise: what exists in both, and what only the service adds.
- **What is deliberately later.** The capability the product is named for may not be in v1. Say so, and say what its arrival may not change.

## What it holds, in the order a reader needs it

- One paragraph: what it is, who the user is, what it does not do.
- The behaviours the product turns on, named. Where it turns on a distinction, name both sides.
- Each behaviour, with its rules and its numbers.
- The interface as behaviour: what happens, not what it looks like.
- Constraints: what it must never do, and any it cannot meet alone.
- Ownership: what an account owns, who can reach the data, how it leaves, and what an operator can see.
- Scope: what v1 does not do. Then acceptance: what v1 must do, each item measurable.
- The name: what the name has to do, not the name itself.

## Rules

- A number you cannot measure yet gets a provisional value, marked provisional, and the thing that will freeze it. Never invent a number and mark it decided.
- Every acceptance item must be checkable by someone other than its author: a time, a count, a replayable input trace.
- A constraint the product cannot meet alone is written with the step the user or the platform must take.
- A promise tied to a mechanism breaks when the mechanism changes. When a platform step is swapped, re-read every document that named it.
- **`Not this version` holds work that may return. A unit the operator puts out of the picture is deleted.**
- Remove it from Scope, Behaviour, the system document and the design. Keep no sentence that explains the absence: a line saying it is out of scope is still a reference.
- **A happy-path version does not carry its edge cases.** When the operator asks for the simplest build, cut the deferred branches: a second unit per root, parallel work, a retry. Keep only the guarantees that make the version true.

## Shipping a version

- Grep the product and system documents for the previous version number before you write the release. The acceptance line and any promise scoped to it go stale in the same edit.
- Check `## Scope` for the item this version built; it leaves `Not this version`.
- The product document keeps no changelog and no roadmap. What shipped, and when, is the release record.
