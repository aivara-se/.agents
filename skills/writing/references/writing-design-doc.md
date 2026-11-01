# Design document

The one authoritative place for what the interface looks like and the values that are fixed. Behaviour belongs to the product document and serving to the system document. Link to them; do not restate them.

## What it holds, in the order a reader needs it

- The screen or surface, and what is on it.
- The fixed geometry: the anchor, the alignment, the ratio, the point a thing is pinned to.
- What changes over time — growth, aging, overflow — and where each one ends.
- How a state is shown, so it survives without colour.
- Type and colour as rules. The measured values sit beside them once measured.

## Rules

- A concept diagram is a guide, not law. Follow what it shows, and describe it as drawn. Do not do the opposite of it either: a concept drawn light is not shipped dark because nothing said otherwise.
- Measure a value on the surface it is used on before it ships. Until then it is marked measured-at-build. Never invent a number and mark it decided.
- Trace each number to the rule that sets it on that element. A value copied from a neighbouring element is a different surface, and a false number.
- Write the edge: what happens when the column fills, a line wraps, the oldest item leaves.
- Nothing is signalled by colour alone. A changed or marked thing is also a shape, a weight or a word.
- One movement, off under `prefers-reduced-motion: reduce`.
