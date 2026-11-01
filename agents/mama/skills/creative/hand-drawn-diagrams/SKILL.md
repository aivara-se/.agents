---
name: hand-drawn-diagrams
description: "Draw hand-drawn (Excalidraw) diagrams as SVG, then PNG."
version: 1.0.1
author: MaMa (aivara.se)
license: MIT
dependencies: []
platforms: [linux, macos]
metadata:
  hermes:
    tags: [diagrams, excalidraw, svg, hand-drawn, architecture, whiteboard]
    related_skills: [architecture-diagram]
---

# Hand-drawn diagrams

## When to Use

- The operator asks for a diagram that looks hand-drawn, sketched, whiteboard, or Excalidraw-like.
- Two drawings side by side: the code as it is, and the shape it should take.
- The drawing has to be read on a phone, so the delivery is a PNG in chat plus a self-contained
  HTML source.

`architecture-diagram` is the other mode — dark, gridded, precise — for infrastructure when nobody
asked for a sketch. This skill renders through librsvg: the wobble comes from `feTurbulence`, the
hand is a Kalam face, the fills are Excalidraw's pastels, and no drawing library is involved.

Support files: `templates/canvas.py` (the generator to copy) and `references/visual-qa.md` (how to
inspect a render before delivering it).

## Procedure

1. **Ground every label in the tree before drawing.** Fetch, then read the source, not a stale
   checkout (`git fetch origin`, `git show origin/main:<path>`). Ports, paths, env-var names and
   roster names come from the README's configuration example, `docs/SYSTEMS.md` and the code —
   never from memory or from a plausible-looking guess. Line counts come from `wc -l` on the files
   you name. A diagram is a claim about the code; a wrong port costs the whole drawing its trust.
2. **Say what the picture is and what it is not.** Title and one subtitle line carry the ref, the
   size of the thing and the version. For a proposal, say in the subtitle that it is a proposal.
3. **Lay out in bands, not in a flowchart spiral.** External systems on the left, the process
   boundary in the centre as a dashed rounded rect, sinks (audit, metrics, absence notes) bottom
   right, findings as a row of sticky notes along the bottom. Canvas ~1500x1200 makes a readable
   PNG; the smallest annotation is 10 px at that width, body 11–12 px, titles 13–15 px.
4. **Build it from `templates/canvas.py`.** Copy the file, keep `Canvas`, replace its `demo()` with
   one function per diagram. It carries the primitives: double-stroked rect, wobbly arrow,
   sticky note, numbered badge, text helper, dot grid, HTML wrapper with the font embedded.
5. **Rasterise with rsvg — not through a browser.**
   ```sh
   apt-get update -qq && apt-get install -y -qq librsvg2-bin   # once
   mkdir -p ~/.fonts && curl -sSL -o ~/.fonts/Kalam-Regular.ttf \
     https://github.com/google/fonts/raw/main/ofl/kalam/Kalam-Regular.ttf
   curl -sSL -o ~/.fonts/Kalam-Bold.ttf \
     https://github.com/google/fonts/raw/main/ofl/kalam/Kalam-Bold.ttf
   fc-cache -f
   rsvg-convert -z 2 -o diagram.png diagram.svg
   ```
   rsvg resolves the font through fontconfig, so the TTF must be installed; an `@font-face` data
   URI only serves the HTML. librsvg implements `feTurbulence`/`feDisplacementMap`, which is what
   makes the wobble, so no drawing library and no browser are needed at all.
6. **Inspect before delivering** — `references/visual-qa.md`. Render at `-z 2`, downscale a copy to
   1500 px for the whole view, crop regions at original pixels for detail, fix the generator, re-render.
7. **Deliver the artefacts, not a description.** Every diagram as `MEDIA:<abs path>.png`, the two
   HTML files as documents, and a reading note under 150 words. Name the one or two things the
   operator should look at, and report anything the drawing surfaced as a decision.

## Drawing rules

- **Text never takes the wobble filter.** Put shapes in `<g filter="url(#r1)">`, draw text after
  the group. A displaced glyph is a blurry glyph.
- **Double-stroke every box**: the styled rect, then the same rect offset ~1.2 px at opacity .45
  behind a second filter seed. That twin line is what reads as hand-drawn rather than as a
  rounded rectangle.
- **No rotated labels.** Rotated SVG text in a corridor clips against the boundary and overlaps
  the line it is meant to name. Use a horizontal label with room, or drop it and let the box say it.
- **Arrows bow slightly** (2–3 px control-point offset) and carry a two-line arrowhead; a perfectly
  straight line exposes the filter's limits and the bbox can collapse.
- **A connector in the gap between two stacked boxes is read as joining those two boxes.** If the
  true source is a box higher up, route the line down the outer corridor inside the process border.
- **Notes are sized to their text.** Five lines at 11.4 px fills ~130 px; a 196 px note with five
  lines is a visible void.
- **Every callout number ties to a note.** A badge with no matching note, or a note with no badge,
  is noise.
- **When the operator names a pattern, draw its inventory.** "One file per webhook type, one per
  dispatch type, behind interfaces" is drawn as chip grids inside the router box plus the two
  interface signatures in its footer — the file list *is* the proposal, not decoration.
- **The interface names the type it matches on, not the transport value.** A `Flow` that says
  `Match(Delivery)` where the dispatcher has already decoded an `Event` misstates the seam the
  drawing exists to argue for. Check every signature against the box it sits in.
- **A label that does not fit the gap straddles both borders.** A 30 px gap holds nothing longer
  than about four characters: drop the label and let the receiving box's first line carry the
  type (`Decide(Delivery) []Wake`).

## Drawing a proposal next to the present

The pair is a design artefact, so the two drawings must be comparable: same outer systems, same
process boundary, same notes strip, same palette. What changes is the interior.

- **Separate refactors from decisions, in the drawing and in the reply.** A seam that moves code
  between packages changes no behaviour; a new config field, an allowlist, a new route can. Mark
  the second kind explicitly ("needs an ADR first") and do not draw it as settled.
- **Do not resurrect a rejected mechanism just because it would tidy the picture.** If the records
  say no queue, no run table, no boot reconcile, the improvement drawing says "what stays the
  same" beside it — that line is what stops a reader treating the sketch as a rewrite.
- **Name the cost of the proposal** in its own box: what moves, what does not, and how many
  packages it really is. A proposal drawn without its cost reads as a wish.
- **A redraw on direction moves the interior, not the frame.** When the operator names the seam
  they care about, rebuild the proposal's process box and its notes and leave the as-is drawing,
  the external band and the palette untouched — the pair's value is that a reader can lay one over
  the other. Re-check the width of every box whose *contents* changed: a chip grid and two
  interface lines are new text in an old rectangle, not a retitled one.
- **Draw the shape that was asked for, and leave one decision in the margin.** Direction is not a
  request to re-argue the design; the drawing implements it, and the only thing still marked as
  unsettled is the part that changes behaviour (a config field, an allowlist, a route).

## Pitfalls

- **`vision_analyze` regions are in the image's pixels, not your layout's.** On a `-z 2` render every
  layout coordinate doubles; passing layout numbers inspects a patch and the model answers "cropped,
  cannot judge". Multiply by the zoom factor first.
- **A 3000 px PNG can time out the vision call.** Analyse the 1500 px downscale, then crop the 2x
  original for detail.
- **Ask a narrow question per crop** ("does any text cross this border", "could this arrow be read as
  C to D"), never "describe this image" — a prose answer repeats the labels and buries the defect.
- **Do not let a diagram restate the documents.** Labels are identifiers, numbers and package names;
  a sentence copied from `PRODUCT.md` onto a box is the second copy the org keeps deleting.
- **Do not draw an element the tree does not have.** A decided-but-unbuilt package is drawn dashed
  grey and labelled "decided, not built" — never solid beside the shipped ones.
- **Check the width of the longest line against its box** before rendering: Kalam at 11 px runs
  ~6 px per character, so a 300 px box holds about 44 characters including padding.
