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

- The operator asks for a diagram that looks hand-drawn, sketched, whiteboard or Excalidraw-like.
- Two drawings side by side: the code as it is, and the shape it should take.
- The drawing must be read on a phone, so you deliver a PNG in chat plus a self-contained HTML source.

`architecture-diagram` is the other mode — dark, gridded, precise — for infrastructure when nobody asked for a sketch. Here librsvg does the work: wobble from `feTurbulence`, a Kalam face, Excalidraw's pastel fills, no drawing library.

Support files: `templates/canvas.py` (the generator to copy) and `references/visual-qa.md` (how to inspect a render before delivering it).

## Procedure

1. **Ground every label in the tree before drawing.** Fetch, then read the source, not a stale checkout (`git fetch origin`, `git show origin/main:<path>`). Ports, paths, env-var names and roster names come from the README's configuration example, `docs/SYSTEMS.md` and the code — never from memory. Line counts come from `wc -l` on the files you name. A diagram is a claim about the code; one wrong port costs the whole drawing its trust.
2. **Say what the picture is and what it is not.** Title and one subtitle line carry the ref, the size of the thing and the version. For a proposal, say "proposal" in the subtitle.
3. **Lay out in bands, not in a flowchart spiral.** External systems left, the process boundary centre as a dashed rounded rect, sinks (audit, metrics, absence notes) bottom right, findings as sticky notes along the bottom. A 1500x1200 canvas makes a readable PNG: annotations 10 px, body 11–12 px, titles 13–15 px.
4. **Build it from `templates/canvas.py`.** Copy it, keep `Canvas`, replace `demo()` with one function per diagram. It carries the primitives: double-stroked rect, wobbly arrow, sticky note, numbered badge, text helper, dot grid, HTML wrapper with the font embedded.
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
   rsvg resolves the font through fontconfig, so the TTF must be installed; an `@font-face` data URI only serves the HTML. librsvg implements `feTurbulence`/`feDisplacementMap`, which is what makes the wobble — no drawing library and no browser needed.
6. **Inspect before delivering** — `references/visual-qa.md`. Render, look, fix the generator, re-render.
7. **Deliver the artefacts, not a description.** Each diagram as `MEDIA:<abs path>.png`, the two HTML files as documents, and a reading note under 150 words naming the one or two things to look at.

## Drawing rules

- **Text never takes the wobble filter.** Put shapes in `<g filter="url(#r1)">` and draw text after the group; a displaced glyph is a blurry glyph.
- **Double-stroke every box**: the styled rect, then the same rect offset ~1.2 px at opacity .45 behind a second filter seed. That twin line is what reads as hand-drawn rather than as a rounded rectangle.
- **Arrows bow slightly** (2–3 px control-point offset) with a two-line arrowhead; a perfectly straight line exposes the filter's limits and the bbox can collapse.
- **Rotated labels and gap connectors** are the two defects that survive a whole-view check — see `references/visual-qa.md` for their fixes.
- **Every callout number ties to a note.** A badge with no note, or a note with no badge, is noise.
- **When the operator names a pattern, draw its inventory.** "One file per webhook type, one per dispatch type, behind interfaces" is chip grids inside the router box plus the two interface signatures in its footer — the file list _is_ the proposal.
- **The interface names the type it matches on, not the transport value.** A `Flow` that says `Match(Delivery)` where the dispatcher has already decoded an `Event` misstates the seam the drawing argues for. Check every signature against its box.
- **A label that does not fit its gap straddles both borders.** A 30 px gap holds about four characters: drop the label and let the receiving box's first line carry the type (`Decide(Delivery) []Wake`).

## Drawing a proposal next to the present

The two drawings must be comparable: same outer systems, process boundary, notes strip and palette. Only the interior changes.

- **Separate refactors from decisions, in the drawing and in the reply.** A seam that moves code between packages changes no behaviour; a new config field, allowlist or route can. Mark the second kind ("needs an ADR first"); do not draw it as settled.
- **Do not resurrect a rejected mechanism because it would tidy the picture.** If the records say no queue, no run table, no boot reconcile, the improvement drawing says "what stays the same" beside it — that stops a reader treating the sketch as a rewrite.
- **Name the cost of the proposal** in its own box: what moves, what does not, how many packages it really is.
- **A redraw on direction moves the interior, not the frame.** Rebuild the proposal's process box and notes; leave the as-is drawing, the external band and the palette untouched so a reader can lay one over the other. Re-check the width of every box whose _contents_ changed.

## Pitfalls

- **Vision regions are in the image's pixels, not your layout's.** A `-z 2` render doubles every coordinate; passing layout numbers inspects a patch and the model answers "cropped, cannot judge". The rest of the inspection loop is in `references/visual-qa.md`.
- **Do not let a diagram restate the documents.** Labels are identifiers, numbers and package names; a sentence copied from `PRODUCT.md` onto a box is the second copy the org keeps deleting.
- **Do not draw an element the tree does not have.** A decided-but-unbuilt package is dashed grey, labelled "decided, not built" — never solid beside the shipped ones.
- **Check the longest line against its box width** before rendering: Kalam at 11 px runs ~6 px per character, so a 300 px box holds about 44 characters.
