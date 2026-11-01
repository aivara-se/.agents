# Icons and artwork

Icons are hand-written inline SVG. Do not add an icon library. Where official artwork exists, vendor it; never re-draw it.

## Source it

- Octicons paths: `https://raw.githubusercontent.com/primer/octicons/main/icons/<name>-<size>.svg` — take the `d` and the `viewBox` together; the coordinates are drawn on that size's grid.
- GitHub's brand kit: `https://brand.github.com/GitHub_Logos.zip` — the Invertocat as PNG and SVG, black and white, with and without clearspace.
- Name the source in a comment beside the vendored path.

## Vendor, then diff

Copy the `d` out of the downloaded file; never type it from memory or redraw it from an image. One mistyped coordinate changes the silhouette while the markup still looks plausible. Prove the copy by comparing its bytes against the source file's.

## A silhouette as a mask

A shape that has no vector — a reference PNG, a screenshot — stays usable as a mask asset. Tracing it to a path is worse: a trace at icon resolution changes the shape it was meant to copy.

1. Crop to the bounding box; the alpha channel tells you where the ink is.
2. Threshold to one bit: the silhouette becomes transparent, its field opaque. The inverse reads as an embossed mark, not a hole.
3. Resize to about 16× the icon (256px for 16px) and re-threshold, so the file stays two-valued.
4. Ship it as a PNG in `static/`, named for what it is, with the artwork's source in a comment.
5. Draw it with `background-color: currentColor` plus `mask` and `-webkit-mask: url(...) center / <size> no-repeat` — never `mask` alone, Safari wants the prefixed form. A painted `<img>` cannot follow the page's ink, and a second colour would have to be drawn for a dark background; the mask takes the link's colour in both schemes.
6. Prove it with pixels: compare the rendered silhouette against the artwork and report the percentage (`testing` → `references/browser-checks.md`). A wrong crop or threshold looks "close enough" by eye and the number catches it.

**For a solid shape out of a square tile, the Invertocat is the wrong artwork.** Its middle is open — GitHub's own files measure about 45% ink — so the tile shows through the cat. Check the source's coverage and source artwork that reads solid at 16px; thickening someone else's mark is a defect.

To knock a vendored path out of a square tile, use an SVG `<mask>`: white keeps the tile, black cuts it, and the mask holds the path with its transform while the tile stays a plain rect. Size by measurement — a 16px tile at `scale(0.75)` leaves a 2px rim — then read the glyph's rendered rect with `getBoundingClientRect()`, because `getBBox()` ignores the transform you are checking.

## Reconstructing a vector from a raster

A favicon and an in-page mark need a real path, so measure the picture rather than tracing it. A geometric mark — a ring and two straight legs, say — fits the pixels exactly:

1. **Read the ink first.** Greyscale, threshold at 0.5, then walk rows and columns for runs of black. Runs give the centre, the radii, the stroke width and the slope of every straight edge.
2. **Fit, do not estimate.** Write the shape as a numpy mask (annulus ∪ two thick strips, clipped to the outer circle) and hill-climb the parameters against the thresholded original. IoU above 0.98 is the bar. Fit the centre too: the same shape a third of a pixel off reads 0.98 where a centred one reads 0.99.
3. **Draw it with the fewest primitives it allows** — a `<circle>` and a two-segment `<path>` with `stroke-linejoin="miter"`, both inside a `clipPath` of the outer circle, with the ends run past the circle so the clip turns the joins into the ring. Snapped numbers within 0.3px of the fit beat the fit's decimals: the file is read by people.
4. **Separate elements union; one path with `fill-rule="evenodd"` does not.** A ring is a circle with a hole; a second element drawn over it is a union. Put both in one path with evenodd and every overlap becomes a hole.
5. Prove it by rasterising the SVG at the source's size and comparing masks: 0.98–0.99 is faithful.

## Shipping the icon set

- **One drawing, one file — until the operator asks for a favicon per scheme.** A single-colour mark is one SVG behind `rel="icon" type="image/svg+xml"`, used by the pages too. Two schemes need two links whose `media` selects them, and the `.ico` (which cannot switch) stays at `/favicon.ico`:

```html
<link
  rel="icon"
  type="image/svg+xml"
  href="/favicon-light.svg"
  media="(prefers-color-scheme: light)"
/>
<link
  rel="icon"
  type="image/svg+xml"
  href="/favicon-dark.svg"
  media="(prefers-color-scheme: dark)"
/>
<link rel="icon" href="/favicon.ico" sizes="32x32" />
```

Both carry the same geometry, black ink in the light one and white in the dark one. Change both numbers in the same edit, or the pair drifts. Prove it by rendering each at 32px on white and on `#202124` and sampling the ink colour — the head's markup says nothing about which file the browser chose. A `favicon.png` nothing points at is deleted, not kept as a third copy.

To restore a variant, use `git show <commit>:static/favicon-light.svg > static/favicon-light.svg` rather than rewriting it: the pair only works while the geometry is identical. Check whether the default filename was renamed meanwhile.

- **A favicon request is the favicon and nothing else.** Regenerating the app icons, the maskable pair or `apple-touch-icon` because they show the same mark comes back as "revert all other changes". Name the rest as left out in the pull-request body.
- **Rasterise with headless Chromium, not ImageMagick.** `chrome --headless --no-sandbox --screenshot=out.png --window-size=N,N --default-background-color=00000000 page.html` renders the SVG at exactly N px on a transparent field; ImageMagick's MSVG renderer silently dropped the clipped group and produced a flat fill. Sample the pixels before use.
- **A multi-size `.ico` has to be assembled.** PIL resamples one source into every size, so the 16px frame is a blurred 512. Render each size natively and write the container by hand: `ICONDIR` (reserved 0, type 1, count) then one 16-byte entry per size — width, height, 0, 0, planes 1, bit count 32, PNG length, offset — then the frames. PNG frames are accepted by every current engine; a 32bpp DIB frame (40-byte header with height doubled, BGRA rows bottom-up, then the 1-bit AND mask padded to 32 bits) is what ImageMagick and Pillow write.
- **Let the formatter decide the markup's wrapping.** Prettier re-joins any element that fits, so a hand-wrapped `<link>` block makes `format:check` fail on a file just written. Run the repository's format script and take what it produces.
- **Maskable icons are opaque and inset**, or the launcher's mask crops the mark: put it on the site's background at about 72%, which keeps the ring inside the 40% safe circle. `apple-touch-icon` gets the same ground — iOS paints transparency black.
- **"Inverted" means white on transparent, and that is invisible on a light tab bar.** Build it as asked, then say so: the light variant is a second SVG behind `media="(prefers-color-scheme: light)"`, not a silent compromise.
- A product document may list the brand assets as untouchable. The operator's request outranks it; edit the assets and name the stale line in the pull-request body.

## Changing the ground under a mark

- **A transparent-background request deletes the tile, not the clip.** The ink ground is one `<rect width="…" height="…" fill=…>`; remove it and leave the `clipPath` around the strokes, which is what cuts the ring and the miter joins into a circle — drop it too and the legs run out to the corners.
- **Rebuild the `.ico` from the edited SVG and prove alpha in every frame.** Assert a corner pixel's alpha is 0 and the ink still samples (`testing` → `references/browser-checks.md`). An engine that ignores the SVG falls back to the `.ico`, so a container left alone keeps the old tile. File length proves nothing — a rebuild at the same sizes lands on the same byte count — compare the hash and the pixels. Then build and `cmp static/favicon.* build/favicon.*`.
- **A white mark on transparency looks blank to a vision check.** `vision_analyze` composites onto white and reports an empty square; composite the render onto the ink colour first (`alpha_composite` over `#0c0d1d`) and read the alpha channel yourself.
