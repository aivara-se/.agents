# Design document

The design document is the one authoritative place for what the interface looks like and the values that are fixed. Behaviour belongs to the product document and serving to the system document; the design document links to them and does not restate them.

## What it holds, in the order a reader needs it

- The screen or surface, and what is on it.
- The fixed geometry: the anchor, the alignment, the ratio, the point a thing is pinned to.
- What changes over time — growth, aging, overflow — and where each one ends.
- How a state is shown, so it survives without colour.
- Type and colour as rules; the measured values sit beside them once measured.

## Rules

- A concept diagram is binding. Encode its geometry exactly as drawn — the anchor, the ratio, the direction of growth — and describe what the diagram shows, not a rationale for it you have not verified.
- A value is measured on the surface it is used on before it ships; until then it is marked measured-at-build. Never invent a number and mark it decided.
- Write the edge: what happens when the column fills, a line wraps, the oldest item leaves. An unstated edge is where the build guesses.
- Nothing is signalled by colour alone: a changed or marked thing is also a shape, a weight or a word.
- One movement, off under `prefers-reduced-motion: reduce`.
