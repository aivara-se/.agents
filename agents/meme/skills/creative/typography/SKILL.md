---
name: typography
description: Use when choosing typefaces for a reading product.
when-to-use: A new product whose type is the interface, a font swap, or a request to research fonts.
---

# Typography for products that are read

## Decide by the reading job

- Prose read in sentences gets a serif; labels, dates and controls are scanned, so they keep a sans. Two families at most.
- A screen serif needs a large x-height, open apertures, moderate contrast and a real italic; an optical-size axis helps.
- The setting outranks the family: 18–20px, line-height 1.6–1.7, 60–75 characters.

## Shortlist (OFL, safe to bundle)

| Family | Character | Best for |
| --- | --- | --- |
| Newsreader | Paperback, literary, optical sizes | Journal prose read in sentences |
| Literata | Sturdy e-reader, large x-height | Long reading, the safe default |
| Lora | Warm, calligraphic | Intimate, but reads blog-familiar |
| Spectral | Editorial, elegant, cool | Distinctive long-form, less personal |
| Source Serif 4 | Neutral workhorse | Product text, pairs with a sans |

- Personal journal: Newsreader first; Literata if comfort outranks character; Lora only if warmth is the point.
- Pair the serif body with the existing sans; no third family for dates.

## Prove it in the product

- Set the same real paragraph at the real size in the running app; compare candidates at 100%, never from a specimen page. Judge whether the page feels kept or processed, whether 19px is heavy enough, whether the chrome disappears.
- The measure is the rendered text, not the container: a date rail and its gap come off the column (a 46rem log with a 7.5rem rail and a 1.5rem gap sets a 34rem note). Re-measure after any layout change, and run the `text-measure-check` script on the shipped woff2.
- Variable fonts: pick 450 rather than 400 on a light background; set `font-optical-sizing: auto`.

## Ship it

- Bundle the woff2 and its OFL; never a CDN if the product promises offline. Latin-1 covers English and Swedish; say what is left out.
- `font-display: block` for a local file, `-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`.
- Mechanics: the `tinyjs` skill's `references/bundled-fonts.md`.
