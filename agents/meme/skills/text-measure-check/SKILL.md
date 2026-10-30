---
name: text-measure-check
description: Use when a claimed text measure or face must be checked.
when-to-use: A review or a pull request says a column sets N characters a line, or that a face is or is not in use, and you have to confirm it before agreeing or pushing back.
---

# Text measure check

A font metric is a number you read, not one you reason about. Shape the shipped file, in a real browser, at the width the app uses.

## Procedure

1. Take the font from the tree, not the system: `src/frontend/fonts/*.woff2`, base64 into a `@font-face` data URL so no server is needed.
2. Copy the CSS the app really has: family, size, weight, line-height, letter-spacing, `font-optical-sizing`, `font-kerning`, `font-variant-ligatures`.
3. Layout: `white-space: pre-wrap`, width in px (`34rem` = 544px), one div per prose paragraph.
4. **Await `document.fonts.ready` after the text is in the DOM.** Text set later measures in the fallback face; with `font-display: block` the widths silently come from `serif`.
5. Split lines by character rect: a new line starts when `rect.left` stops increasing. `rect.top` does not work — it is the ink box and varies inside one line.
6. Count characters **including spaces** (that is the number the sources quote), drop each paragraph's last line, then take median and widest.
7. Check the face is really in use: `document.fonts.check('19px "Newsreader"')` and a width comparison against `serif` on a long no-wrap string.

`scripts/measure.mjs` does all of it: node, the global `playwright` package, Chromium at `/opt/playwright`.

## Verifying a built app

`dist/<app>` embeds the frontend as a zip starting at the `PK\x03\x04` offset. Extract it, load `index.html` in Chromium at the window size from `tinyjs.json`, and read `#note`'s box plus `.bar`'s box from the real CSS.

## Pitfalls

- The app binary exits 0 at once when another instance is up: a shared sandbox usually has one running on `:99`. Never judge a screenshot of `:99` as your build — check `pgrep -af launcher` for which `dist` it came from.
- A shared shell: `export HOME=...` persists into later calls and breaks `gh` (its token lives in `/root/.config/gh`). Set `HOME=/root` at the start of the command.
- `du -sb dist` moves by a byte or two between builds (embedded build id): never pin an exact byte count in a pull request body.
- In a grid, measure the text column, not the container: a `43rem` log with a `7.5rem` date rail and a `1.5rem` gap sets a `34rem` note. Measuring the container reports a line a rail wider than the text.
