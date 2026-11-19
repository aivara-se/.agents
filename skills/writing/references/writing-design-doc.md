# Design document

The one authoritative place for the design language and the values that are fixed: colour, type, space, elevation, shape, the brand and the experience rules. Behaviour belongs to the product document and serving to the system document; the mock is the reference for what the screen carries. Link to them; do not restate them.

The file format — YAML tokens, the eight sections and their order — is `design-md-format.md`.

## What it holds, in the order a reader needs it

- The design language: colour, type, space, elevation and shape, as rules and tokens.
- The brand: the wordmark, the typefaces, what the surface never adds.
- The experience: how the operator reads it, the order of a scan, what the surface must never invite.
- How a state is shown, so it survives without colour.
- The measured values, beside the rule they set.

Not the UI's content: no component anatomy, no per-element layout, no sentence about what appears where. The mock is the reference for that, and a model restated here goes stale with the next product change.

## Rules

- A concept diagram is a guide, not law. Follow what it shows, and describe it as drawn. Do not do the opposite of it either: a concept drawn light is not shipped dark because nothing said otherwise.
- Measure a value on the surface it is used on before it ships. Until then it is marked measured-at-build. Never invent a number and mark it decided.
- Trace each number to the rule that sets it on that element. A value copied from a neighbouring element is a different surface, and a false number.
- **The frontmatter is a value's only home.** Prose names the token (`{components.rail.width}`) and never repeats the number; two copies drift, and the reader cannot tell which is true.
- **The Overview says what the surface is for, not what the model is.** A unit, a flow or a relation restated here goes stale with the next product change.
- **Do not print interface copy.** Describe the treatment — "its first word at weight 600" — not the string; the product owns the words.
- Write the edge: what happens when the column fills, a line wraps, the oldest item leaves.
- Nothing is signalled by colour alone. A changed or marked thing is also a shape, a weight or a word.
- One movement, off under `prefers-reduced-motion: reduce`.
