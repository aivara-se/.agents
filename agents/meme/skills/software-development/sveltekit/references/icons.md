# Icons and artwork

The site has no icon library and `package.json` should not grow one: icons are hand-written
inline SVG, and where official artwork exists it is vendored, not re-drawn.

## Source it

- Octicons paths: `https://raw.githubusercontent.com/primer/octicons/main/icons/<name>-<size>.svg`
  — take the `d` and the `viewBox` together; the coordinates are drawn on that size's own grid.
- GitHub's brand kit: `https://brand.github.com/GitHub_Logos.zip` — the Invertocat as PNG and
  SVG, black and white, with and without clearspace.
- Name the source in a comment beside the vendored path.

## Vendor, then diff

Copy the `d` out of the downloaded file; never type it from memory or redraw it from an image.
Path data is unreadable at review, and one mistyped coordinate changes the silhouette while the
markup still looks plausible. Prove the copy by comparing its bytes against the source file's.

## Composing a shape the vendor does not ship

There is no square variant of the Invertocat — GitHub ships the mark and the mark+wordmark
lockup, nothing square. A square icon is a composition:

- A filled tile with the silhouette knocked out through an SVG `<mask>`: white keeps the tile,
  black cuts it. The mask holds the vendored path with its transform, so the tile itself stays
  a plain rect.
- Size by measurement: choose the rim you want (a 16px tile at `scale(0.75)` leaves a 2px rim
  on all four sides), apply the transform, then read the glyph's rendered rect with
  `getBoundingClientRect()` — `getBBox()` ignores the transform you are checking.
- Prove the knockout with pixels, not geometry: the rim must sample ink and the cut area must
  sample transparent (recipe in `testing` → `references/browser-checks.md`, "Reading a shape
  you cannot see").

## When the artwork arrives as a raster

A silhouette that exists only as a picture — a reference PNG, a screenshot of an icon someone
sent you — is still usable, and the worse routes are re-drawing it by hand or tracing it to a
path: a trace at icon resolution changes the shape it was meant to copy. Carry the picture as
a mask asset instead.

1. Crop the artwork to its own bounding box; the alpha channel tells you where the ink is.
2. Threshold it to one bit — two values, nothing in between. The silhouette becomes
   transparent, the field it sits in becomes opaque.
3. Resize to about 16× the icon (256px for a 16px icon) and re-threshold after the resize, so
   the file stays two-valued.
4. Save it in `static/` and draw it with `background-color: currentColor` plus `mask` and
   `-webkit-mask: url(...) center / <size> no-repeat` — never `mask` alone, Safari still wants
   the prefixed form. The colour still comes from the link, so the icon follows light and dark
   with no second asset.
5. Prove it with pixels, not impressions: map the rendered icon and compare its silhouette
   against the artwork it came from (recipe in `testing` → `references/browser-checks.md`) and
   report the percentage. That number is how faithful the reproduction is — it also catches a
   wrong crop or threshold, which look "close enough" by eye.

## Cutting a solid silhouette out of a tile

When the brief is a *solid* shape knocked out of a square, the Invertocat is the wrong
artwork — its middle is open, so the tile shows through the cat. Source silhouette artwork
that reads solid at 16px and cut it from that; thickening someone else's mark to fill the
gap is a defect, not a fix.

The cut is a raster pipeline, run on the source asset rather than drawn by hand:

1. Threshold to one bit — two values and nothing between, so the shape survives every step after.
2. Make the black (the shape) transparent and keep the tile opaque. The inverse reads as an
   embossed mark, not a hole.
3. Resize well above the icon size — 256px for a 16px icon — and ship it as a PNG asset in
   `static/`, named for what it is, with the artwork's source named in a comment beside it,
   as for a vendored path.
4. Use it as an SVG/CSS **mask**, so the square takes the link's own `currentColor` and the
   silhouette is a true hole. A painted `<img>` cannot follow the page's ink, and a second
   colour would have to be drawn for a dark background.

Prove the cut with pixels, not the intent: the tile must sample ink and the silhouette
transparent, and your render should match the source artwork once both are normalised to
their ink box (recipe in `testing` → `references/browser-checks.md`).

Hand-tracing the bitmap into an SVG path is not the alternative: a mistyped curve changes the
silhouette exactly as a mistyped `d` does, and an autotraced curve at icon resolution changes
the shape it copied. The mask needs no path and no dependency, so prefer it — and when a
vector genuinely is required (a favicon, an in-page mark), reconstruct it by measurement, not
by hand: "Reconstructing a vector from a raster" below.

## Reconstructing a vector from a raster

A favicon and a mark used inside pages need a real path, so the picture is measured rather
than traced. A geometric mark — a ring and two straight legs, say — is a handful of numbers,
and they can be fitted to the pixels exactly:

1. **Read the ink first.** Greyscale, threshold at 0.5, then walk rows and columns for runs of
   black. Runs give the centre, the outer and inner radii, the stroke width and the slope of
   every straight edge — a ring with a V inside is four numbers plus a slope.
2. **Fit, do not estimate.** Write the shape as a numpy mask (annulus ∪ two thick strips,
   clipped to the outer circle) and hill-climb the parameters against the thresholded
   original. IoU above 0.98 is the bar. Fit the centre too, not just the radii: the same shape
   a third of a pixel off reads 0.98 where a centred one reads 0.99.
3. **Draw it with the fewest primitives it allows** — a `<circle>` and a two-segment `<path>`
   with `stroke-linejoin="miter"`, both inside a `clipPath` of the outer circle, with the ends
   run past the circle so the clip makes the joins into the ring. Snapped numbers within 0.3px
   of the fit are better than the fit's decimals: the file is read by people.
4. **Separate elements union; one path with `fill-rule="evenodd"` does not.** A ring is a
   circle with a hole (evenodd inside one `d`), and a second element drawing over it is a
   union. Put both in one path with evenodd and every overlap becomes a hole.
5. Prove it by rasterising the SVG at the source's own size and comparing masks. A faithful
   reconstruction lands at 0.98–0.99; the rest is anti-aliasing along the edge.

## Shipping the icon set

- **One drawing, one file — until the operator asks for a favicon per scheme.** A single-colour
  mark is one SVG pointed at from `rel="icon" type="image/svg+xml"`, and pages use that same
  file. Two schemes need two links whose `media` selects them, and the `.ico` (which cannot
  switch) stays at `/favicon.ico` for everything that ignores an SVG:

```html
<link rel="icon" type="image/svg+xml" href="/favicon-light.svg" media="(prefers-color-scheme: light)" />
<link rel="icon" type="image/svg+xml" href="/favicon-dark.svg" media="(prefers-color-scheme: dark)" />
<link rel="icon" href="/favicon.ico" sizes="32x32" />
```

  The two SVGs carry the same geometry, black ink in the light one and white in the dark one;
  treat them as one asset and change both numbers in the same edit, or the pair drifts. Prove
  it by rendering each at 32px on white and on `#202124` and sampling the ink colour — the
  head's markup says nothing about which file the browser actually chose. A `favicon.png`
  nothing points at any more is deleted rather than kept as a third copy.

  When a variant has to come back, restore it from history with
  `git show <commit>:static/favicon-light.svg > static/favicon-light.svg` instead of
  re-writing it from the survivor: the pair only works while the geometry is identical, and
  history already holds the shape byte for byte. Check whether the default filename was
  renamed in the meantime — the restored link has to point at the path that exists now.

- **A favicon request is the favicon and nothing else.** Regenerating the app icons, the
  maskable pair or `apple-touch-icon` because they show the same mark is scope the operator
  did not ask for, and it comes back as "revert all other changes". Ship the files the link
  tags need, leave the rest untouched, and name the rest as left out in the pull-request body.
- **Rasterise with headless Chromium, not ImageMagick.** `chrome --headless --no-sandbox
  --screenshot=out.png --window-size=N,N --default-background-color=00000000 page.html`
  renders the SVG in a page at exactly N px on a transparent field; ImageMagick's internal
  MSVG renderer silently dropped the clipped group and produced a flat fill with no mark at
  all, so sample the output's pixels before using it.
- **A multi-size `.ico` has to be assembled.** PIL resamples one source into every size, so
  the 16px frame is a blurred 512. Render each size natively and write the container by hand:
  `ICONDIR` (reserved 0, type 1, count) then one 16-byte entry per size — width, height, 0, 0,
  planes 1, bit count 32, PNG length, offset — followed by the frames. PNG frames are accepted
  by every current engine; a 32bpp DIB frame (40-byte header with height doubled, BGRA rows
  bottom-up, then the 1-bit AND mask with each row padded to 32 bits) is what ImageMagick and
  Pillow write, and what the file being replaced likely contains.
- **Let the formatter decide the markup's wrapping.** A `<link>` block hand-wrapped one
  attribute per line reads well, but Prettier re-joins any element that fits, so `format:check`
  fails on the file just written while the markup is identical in meaning. Run the repository's
  format script over the file and take what it produces.
- **Maskable icons are opaque and inset**, or the launcher's mask crops the mark: put it on
  the site's own background and scale it to about 72%, which keeps the ring inside the 40%
  safe circle. `apple-touch-icon` gets the same ground — iOS paints transparency black.
- **"Inverted" means white on transparent, and that is invisible on a light tab bar.** Build
  it as asked, then say so: the light-theme variant is a second SVG behind
  `media="(prefers-color-scheme: light)"`, not a silent compromise.
- A repository's product document may list the brand assets as untouchable. The operator's
  request outranks it; edit the assets and name the stale line in the pull-request body
  instead of editing the document.

## Changing the ground under a mark

- **A transparent-background request deletes the tile, not the clip.** The ink ground is a
  single `<rect width="…" height="…" fill=…>`; remove that element and leave the `clipPath`
  around the strokes, because the clip is what cuts the ring and the miter joins into a
  circle — drop it too and the legs run out to the corners. Nothing else in the file moves.
- **Rebuild the `.ico` from the edited SVG and prove alpha in every frame.** After rendering
  each size, assert a corner pixel's alpha is 0 and the ink still samples (pixel recipe:
  `testing` → `references/browser-checks.md`). An engine that ignores the SVG falls back to
  the `.ico`, so a container left alone keeps the old tile. File length is not evidence of an
  unchanged file — an ICO rebuilt at the same sizes lands on the same byte count — compare
  the hash and the pixels instead. Then build and `cmp static/favicon.* build/favicon.*` so
  the served tree carries the edit.
- **A white mark on transparency looks blank to a vision check.** `vision_analyze` composites
  the image onto white and reports an empty square; composite the render onto the ink colour
  first (`alpha_composite` over `#0c0d1d` or whatever the ground was) and read the alpha
  channel yourself for the transparency claim.

## Read the artwork's ink before promising a look

Source artwork carries negative space you will not guess: the Invertocat's middle is open —
GitHub's own PNG and SVG both measure about 45% ink — so a knocked-out silhouette leaves the
tile showing through the middle of the cat. If the brief is a *solid* silhouette hole, check
the source's coverage first and choose different artwork rather than thickening someone
else's mark — the cut itself is in "Cutting a solid silhouette out of a tile" above.
