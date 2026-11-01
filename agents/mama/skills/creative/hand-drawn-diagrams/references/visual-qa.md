# Inspecting a hand-drawn diagram

The drawing is generated, so every defect is a coordinate in the generator. The loop is:
render, look, fix the number, re-render.

## The loop

1. Render at `-z 2`: `rsvg-convert -z 2 -o d.png d.svg`.
2. Downscale a copy for the whole view: `magick d.png -resize 1500x _view.png`.
3. Look at the whole view first — balance, empty quadrants, a note strip that floats away
   from the process box.
4. Crop the 2x original for detail, one narrow question per crop.
5. Fix the generator, re-render, re-check only the region that changed.

## Region arithmetic

`vision_analyze(region=[x1, y1, x2, y2])` is in the image's own pixels. A `-z 2` render doubles
every coordinate in your layout code: a box at layout (716, 248)–(1186, 700) is region
`[1432, 496, 2372, 1400]`. Passing the layout numbers inspects a small patch of a 3000 px
image, and the answer comes back as "cropped, cannot judge" — the tell is a reply that describes
exactly one box and nothing else.

## What to ask

One question per crop, closed-form:

- "Does any text touch or cross the border of this box?"
- "Could this arrow be read as connecting C to D instead of A to B?"
- "Is any quadrant of this image more than a quarter empty?"
- "Is the smallest label legible at this size?"

Never "describe this image": a prose answer restates the labels and buries the defect.

## Defect list, in the order they bite

1. **Longest line vs box width.** Kalam at 11 px runs about 6 px per character; a 300 px box
   holds roughly 44 characters including padding. Check before rendering, not after.
2. **A vertical connector in the gap between two stacked boxes.** It reads as joining those two.
   Route it down the outer corridor inside the process border, or from the true box's left edge.
3. **Rotated labels.** They clip the boundary or overlap the line they name. Horizontal or none.
4. **Badges straddling a sub-box border** look like a mistake; put the badge outside on a corner,
   or on the outer container's corner where it reads as a callout.
5. **Notes taller than their text.** Five body lines at 11.4 px fills ~130 px; a 196 px card
   leaves a visible void in its lower half.
6. **A quadrant more than ~25% empty** is a composition defect. Fill it with a true fact —
   the host, the deployment, what is deliberately absent — never with decoration.
7. **Dashed "not built" boxes drawn solid.** A planned package must look different from a
   shipped one at a glance, or the drawing claims it exists.
