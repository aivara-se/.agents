---
name: page-geometry-cdp
description: "Measure a page's real layout via headless Chromium over CDP."
version: 1.0.0
author: MiMi
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [cdp, chromium, layout, measurement, verification, web]
    related_skills:
      [dogfood, systematic-debugging, inspecting-hermes-desktop-dom]
---

# Measuring a page's real layout

## Overview

When a claim is about layout — "the avatar is top left", "the content is centred", "it still fits one screen" — an adjective is not evidence and a screenshot is not something you can read. Measure it: headless Chromium, driven over CDP, printing the geometry.

Take this path when no browser daemon is available (`browser-harness: daemon default didn't come up`); a Chromium binary is usually on disk (`ls /opt/playwright/*/chrome-linux64/chrome`, or `google-chrome` on PATH). Node 22 or later ships `fetch` and a global `WebSocket`, so a ~50-line stdlib script is the whole toolchain — no playwright package, no npm install.

**Know the limit.** Geometry, computed styles, the winning rule and status codes are facts. Whether it _looks_ good is still the user's eyes.

## When to Use

- Proving a change matches the page it replaces: measure both, diff the numbers.
- Turning a described layout into values; checking a page still fits one phone screen.
- Finding the winning rule when a style "isn't applying".

**Not for** perf profiling or aesthetics. For the Hermes desktop app, `inspecting-hermes-desktop-dom` already has the port and selectors.

## Procedure

### 1. Find and launch the browser

```bash
ls /opt/playwright/*/chrome-linux64/chrome
```

```
/opt/playwright/chromium-1243/chrome-linux64/chrome --headless=new --no-sandbox --disable-gpu \
  --disable-dev-shm-usage --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-profile about:blank
```

Run it as `terminal(background=true)`: a shell wrapper (`nohup`, `&`, `setsid`) is **refused**. Use a **fresh** `--user-data-dir` per launch — it avoids profile-lock trouble, and it is what makes a state assertion mean anything, since a reused profile still holds the words or login the last run left.

Readiness, in a separate call (`sleep 4` first):

```bash
curl -s --max-time 5 http://127.0.0.1:9222/json/version
```

**The browser endpoint has no `Page` domain.** Connecting to `/json/version`'s `webSocketDebuggerUrl` answers `Page.enable wasn't found`, and the run dies on its first call. Create a page first — `PUT /json/new?about:blank` — and connect to that target's `webSocketDebuggerUrl`.

### 2. Measure

`scripts/measure.mjs` takes `url [width] [height] [expression-file]` and prints one JSON line:

```bash
node scripts/measure.mjs https://aivara.se/mimi 390 844
```

- The viewport is set with `Emulation.setDeviceMetricsOverride` (`mobile: true`), so 390×844 is a phone.
- The expression runs after `Page.loadEventFired` plus a settle; `returnByValue: true` returns a JSON string.
- `expression-file` replaces the built-in expression — how you measure a page whose class names differ.
- `scripts/link-coverage.mjs <url> <row-selector> [width] [height]` answers "is the whole row clickable?" by hit test: the anchor's box against the row's, and `elementFromPoint` at each corner and the centre.

### 3. Measure both and diff

Measure the original and the new page with the **same** expression, then diff the JSON in Python:

```bash
node scripts/measure.mjs https://mimi.aivara.se/ 390 844 > /tmp/old.json
node scripts/measure.mjs https://feat-my-branch.aivara-se.pages.dev/mimi 390 844 > /tmp/new.json
```

Print the shared keys and mark the rest `DIFF`. Three differences are legitimate — name them rather than hide them: the merge's own addresses (`log.html` → `/mimi/log`), where the padding lives (`body` versus the component), and a selector artefact (one page's `.log` is the container, the other's a child).

### 4. Hydration and client-side navigation

`measure.mjs` evaluates **one synchronous** expression (no `awaitPromise`), so a click-and-wait check needs its own script on the same harness: `Page.enable`, `Runtime.enable`, `Log.enable`, navigate, wait for `Page.loadEventFired` plus a settle, then `Runtime.evaluate` with `awaitPromise: true`. It should return:

- **The app's own base.** Frameworks inject a config global — for SvelteKit, `Object.keys(window).find((k) => k.startsWith('__sveltekit_'))` then `window[key].base` — which proves the app is served where its router thinks it is.
- **A marker that outlives the click.** Set `window.__kept = 'x'` before clicking a link; if it survives, the navigation was client-side, since a document load would have cleared it.
- **Nothing on the console.** Collect `Runtime.exceptionThrown`, `Runtime.consoleAPICalled` at `error`/`warning`, and `Log.entryAdded` at those levels: a hydration mismatch is invisible to curl.
- **The addresses it follows**, read from the DOM: `[...document.querySelectorAll('a')].map((a) => a.getAttribute('href'))`.

### 5. Drive the real input

Two silent traps:

- **Setting `.value` and dispatching `input` only reaches a framework binding.** An app listening on `window` never sees it, the screen stays empty, and the run reads as "the change did nothing". Send real keys, per character: `Input.dispatchKeyEvent` `{type: 'keyDown', key: '<char>', code: 'Key<X>', text: '<char>', windowsVirtualKeyCode: <code>}` then the matching `keyUp`, ~30 ms apart. `event.repeat` stays false, which a handler ignoring auto-repeat needs.
- **Assert the result, not the absence of an exception.** Read the markers the input should produce: `document.querySelectorAll('.mark').length`, each node's `dataset`, and for an emoji drawn by `content: attr(data-emoji)` the computed `getComputedStyle(el, '::before').content`.

**A storage change needs the upgrade path.** A fresh profile only exercises seeding: write the _old_ shape into IndexedDB (or `localStorage`) from the page, reload, read it back — the only way to see whether a re-seed kept the user's data and dropped rows the new build no longer ships. Return the database inside `Runtime.evaluate` with `new Promise` + `awaitPromise: true`: `indexedDB.open(name)` → `transaction([...])` → `getAll()` in `onsuccess`, resolving in `transaction.oncomplete`.

**Photograph it and send the file.** `Page.captureScreenshot` after `Emulation.setDeviceMetricsOverride` at phone size, written to a PNG and attached to the reply. Say what was measured beside it; the numbers are the evidence.

## What to read

Project down to a small object — never dump the DOM:

- `getBoundingClientRect()` per element: `x, y, w, h, right, bottom, cx` (`cx` proves **centred**: compare with `innerWidth / 2`).
- `document.documentElement.scrollHeight` versus `innerHeight` — equal means **one screen, no scroll**. `min-height: 100dvh` measuring exactly the viewport is expected, not a bug.
- `getComputedStyle(el).position` for "does this scroll away" (`absolute`, not `fixed`).
- Link colours as `rgb(...)`, so an accent token is checked rather than assumed.
- **The ground may be on `html`, not `body`.** `html { background }` leaves `body`'s `backgroundColor` at `rgba(0, 0, 0, 0)`, which reads as "no background" when the page is painted correctly. Read both before calling a surface missing.
- **A distribution claim** is the container's `justify-content` plus the two edge gaps: compare `first.x - row.x` with `row.right - last.right`. Equal and non-zero is `space-around`; zero on both sides is `space-between`. Quote both numbers.
- **A glyph can match in box and still read heavier.** Size is what `getBoundingClientRect` gives; weight is ink. At `deviceScaleFactor: 2`, crop each button and compare ink mass (`sum(255 - luminance)`) against the parent commit: a 19 px box beside 13.5 px neighbours measures ~40% more ink, and a shrunken `svg` also thins its stroke (1.6 × 14/24 = 0.93 px against 1.27), which the numbers have to clear or name.
- **Presence and absence are measurements too.** Geometry never says whether the nodes you expected are there: a page rendered without its header measures as cleanly as one with it. Count what the change is about, and when it _removed_ something assert the count is zero **in the served artifact** (`document.querySelectorAll('.pill').length === 0`).

## Pitfalls

- **`pkill -f "wrangler pages dev"` kills the shell running it** — the pattern matches its own command line, including a launch later in the same command. Use `fuser -k 8788/tcp` or a bracket (`pkill -f "chrom[e]-linux64"`), in its own call.
- **A promise that resolves with a DOM event never returns over CDP.** `transaction.oncomplete = resolve` hands the evaluator an `Event`, `returnByValue` cannot serialise it, and `awaitPromise: true` never answers — a hung page that is fine. Resolve a primitive and serialise the data yourself. Give every send a timeout (`Promise.race` with an 8 s reject) so a hung call names its method.
- **A framework element's height is its line box when it is a flex item.** The same pill measures 81px inline and 130px in a `display: flex` row: blockified, its height is `line-height × font-size` plus padding and border, where the inline box ignores `line-height`. Match it with `line-height: normal` on the container, not a smaller font-size.
- **A differing key set makes false `DIFF`s.** Diff the intersection, or keep one expression for both pages.
- **One viewport hides a wrap.** Measure a width matrix — 360, 390, a desktop width — recording `scrollWidth` at each. A row that fits at 390 can take a lone fourth item at 360, and it catches a `flex-wrap` that is really a breakpoint decision.
- **A grid or flex child's height is its row's, not its text's.** A two-word label measures 99px because the paragraph beside it set the row, and `height / lineHeight` then invents four lines of wrapping. Measure with a Range (`range.getClientRects().length` for lines, `range.getBoundingClientRect().width` for width), or set `align-self: start` first.
- **Re-measure after every rebuild and every server restart.** The dev server may still serve the previous build.
- **Measure the deployed artifact, not just localhost.** A Cloudflare Pages preview is built from the exact commit; find it in the PR's deploy comment (`https://<short-sha>.<project>.pages.dev`, plus `<branch>.<project>.pages.dev`).
- **After a page-visible change, re-run the site's own gates** (`check`, `test`, `build`). Geometry says nothing about types or tests.
- **`elementFromPoint` answers `null` outside the viewport, and `null` reads as "not clickable".** `scrollIntoView({ block: 'center' })` before probing, and treat all-null probes as missing evidence. "Click target covers the whole row" is exactly this test: row rect against anchor rect plus a probe at each corner — never the CSS, which can be right about the selector and wrong about the box.
- **A focus ring cannot be checked with `element.focus()`.** Chromium withholds `:focus-visible` after a pointer interaction, so a programmatic focus reports `outline-style: none` even when the rule is correct. Drive `Input.dispatchKeyEvent` `rawKeyDown` then `keyUp`, `key: 'Tab'`, `code: 'Tab'`, `windowsVirtualKeyCode: 9`, walk until `document.activeElement` is the target, then read `outlineWidth`, `outlineStyle`, `outlineColor` and `outlineOffset`. `0px none` from a synthetic focus is missing evidence, not a bug.
- **A click selector copied from old markup matches nothing.** `document.querySelector(sel).click()` on `null` throws inside the evaluation, and a runner printing only the return value swallows it. Read the served hrefs first, and treat an unchanged `pathname` as a broken selector until proven otherwise.
- **`document.readyState === 'complete'` means the document arrived, not that the app rendered.** A client-rendered page paints a skeleton and fills it from a later fetch, so a check one fixed second after `complete` counts zero rows and reads as a broken feature. Poll for the node the assertion is about with a deadline, then settle briefly; never trust a fixed sleep. Through a tunnel the page is several times slower, because every module crosses the edge.
