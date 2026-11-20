# DESIGN.md

`DESIGN.md` is a token spec with its rationale. The tokens are the normative values; the prose says when to use them. The format is Google's DESIGN.md: <https://github.com/google-labs-code/design.md>.

## Shape

- Frontmatter sits between two `---` lines: `version: alpha`, `name`, and an optional `description`.
- Top-level groups are `colors`, `typography`, `rounded`, `spacing`, `motion` and `components`. A group may nest, but one path is defined once.
- A color is any CSS color; use hex.
- A typography token is an object: `fontFamily`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`.
- A dimension carries `px`. A motion token is `duration` plus `timingFunction`.
- A component value may cite another token as `"{colors.panel}"`.
- The body has these `##` sections, in this order: Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts. Drop a section only by naming it under `omitted:` with a reason.
- Use the canonical US heading names. `## Colours` is not in the schema.

## How to write it

- State the surface and the reading order first, in one paragraph.
- Give each value once, in the tokens. The prose carries what a token cannot: when to use it, what it must not become, and how a state survives without color.
- Measure contrast and put the ratio beside the rule. A muted color used at 10 px must clear 4.5:1 on every surface it sits on, not only white. Darken the token; do not add a note.
- Name the reference mock and the widths it was checked at.
- Leave behavior to `PRODUCT.md` and mechanism to `SYSTEMS.md`. Link; do not restate.
- Place the file at the repository root when the entry file names it there.

## Pitfalls

- A malformed YAML block fails silently on GitHub. Parse the frontmatter before you commit.
- One top-level key defined twice, in the frontmatter and in an interleaved block, is an error.
- A value copied from a neighbouring surface is a false number until it is measured on its own surface.
