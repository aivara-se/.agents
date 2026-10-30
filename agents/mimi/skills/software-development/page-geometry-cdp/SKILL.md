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
    related_skills: [dogfood, systematic-debugging, inspecting-hermes-desktop-dom]
---

# Measuring a page's real layout

## Overview

When a claim is about layout — "the avatar is top left", "the menu is top right", "the content is
centred", "it still fits one screen" — an adjective is not evidence and a screenshot is not something
you can read. Measure it: launch a headless Chromium, drive it over CDP, and print the geometry.

This is the path to take when no browser daemon is available: the harness daemon does not always come
up in a sandbox (`browser-harness: daemon default didn't come up`), while a Chromium binary is usually
already on disk (`ls /opt/playwright/*/chrome-linux64/chrome`, or `google-chrome` on PATH). Node 22 or
later ships `fetch` and a global `WebSocket`, so a ~50-line stdlib script is the whole toolchain — no
playwright package, no npm install.

Use this for measurement, not instead of the interactive browser: it answers geometry, computed styles
and status codes, which is exactly what a layout claim needs.

**Know what this cannot answer.** Geometry, computed styles, which CSS rule won, status codes: facts.
Whether it *looks* good, colour balance, "is this ugly": still the user's eyes. Measure facts; hand
feel to the user.

## When to Use

- Proving a change matches the page it replaces (measure both, diff the numbers)
- "Avatar top left, menu top right, content centred" — turning a described layout into values
- Whether a page still fits one phone screen after a copy or padding change
- Finding the winning rule when a style "isn't applying" (read the computed value on the real node)
- Anything where you would otherwise write "should look like" or "identical"

**Don't use for:** perf profiling, or judging aesthetics. For the Hermes desktop app itself, the port
and the selectors are already handled by `inspecting-hermes-desktop-dom`.

## Procedure

### 1. Find the browser

```bash
ls /opt/playwright/*/chrome-linux64/chrome
```

### 2. Launch it in the background — with the tool's own flag, never `nohup`

```
/opt/playwright/chromium-1243/chrome-linux64/chrome --headless=new --no-sandbox --disable-gpu \
  --disable-dev-shm-usage --remote-debugging-port=9222 --user-data-dir=/tmp/cdp-profile about:blank
```

Run it as `terminal(background=true)`. A shell-level wrapper (`nohup`, `&`, `setsid`) is **refused** by
the terminal tool. Use a **fresh** `--user-data-dir` per launch: it avoids profile-lock trouble, and it is
also what makes a state assertion mean anything — a reused profile still holds the words or the login the
last run left, so a check for "an empty list at first run" passes or fails for the wrong reason.

Readiness, in a separate call (`sleep 4` first):

```bash
curl -s --max-time 5 http://127.0.0.1:9222/json/version
```

### 3. Measure

`scripts/measure.mjs` (beside this file) takes `url [width] [height] [expression-file]` and prints one
JSON line:

```bash
node scripts/measure.mjs https://aivara.se/mimi 390 844
```

- The viewport is set with `Emulation.setDeviceMetricsOverride` (`mobile: true`), so 390×844 is a phone.
- The expression is evaluated after `Page.loadEventFired` plus a short settle; `returnByValue: true`
  hands back a JSON string.
- `expression-file` replaces the built-in expression — that is how you measure a page whose class names
  differ (see the diff recipe below).
- `scripts/link-coverage.mjs <url> <row-selector> [width] [height]` answers "is the whole row
  clickable?" by hit test: one anchor per row, the anchor's box against the row's, and
  `elementFromPoint` at each corner and the centre.

### 4. The recipe that earns its keep: measure both and diff

To claim a page matches another, measure the original and the new one with the **same** expression and
diff the JSON in Python. Comparing the live site you are replacing against your preview is the strongest
statement available short of the user's eyes:

```bash
node scripts/measure.mjs https://mimi.aivara.se/ 390 844 > /tmp/old.json
node scripts/measure.mjs https://feat-my-branch.aivara-se.pages.dev/mimi 390 844 > /tmp/new.json
```

Then print only the shared keys and mark the others `DIFF`. Expect three kinds of legitimate difference,
and name them rather than hiding them: the merge's own addresses (`log.html` → `/mimi/log`), where the
padding lives (a `body` padding versus the component's own), and a selector artefact (one page's `.log`
is the container, the other's is a child).

### 5. Checking hydration and client-side navigation

`measure.mjs` evaluates **one synchronous** expression (no `awaitPromise`), so a check that has to
click and wait does not fit it. Write that script on the same harness: `Page.enable`, `Runtime.enable`,
`Log.enable`, navigate, wait for `Page.loadEventFired` plus a settle, then
`Runtime.evaluate` with `awaitPromise: true`, click, wait, evaluate again. What it should return:

- **The app's own base.** Frameworks inject a config global — for SvelteKit,
  `Object.keys(window).find((k) => k.startsWith('__sveltekit_'))` then `window[key].base` — which is how
  you prove the app is served where its router thinks it is, rather than inferring it from the HTML.
- **A marker that outlives the click.** Set `window.__kept = 'x'` before clicking a link; if it is still
  there afterwards the navigation was client-side, because a document load would have cleared it. Read it
  with the new `location.pathname`.
- **Nothing on the console.** Collect `Runtime.exceptionThrown`, `Runtime.consoleAPICalled` at
  `error`/`warning`, and `Log.entryAdded` at those levels. "It hydrated" is exactly this claim: a
  hydration mismatch is invisible to curl and shows up nowhere else.
- **The addresses it follows**, read from the DOM rather than assumed:
  `[...document.querySelectorAll('a')].map((a) => a.getAttribute('href'))`.

### 6. Drive the app's real input, and photograph the result

A screen that only changes on input cannot be verified by loading it. Two traps, both silent:

- **Set `.value` and dispatch `input` only reaches a framework binding.** An app that listens on
  `window` (a typing toy, a game, anything with a keyboard handler) never sees it, the screen stays
  empty, and the run reads as "the change did nothing". Send real keys: for each character,
  `Input.dispatchKeyEvent` `{type: 'keyDown', key: '<char>', code: 'Key<X>', text: '<char>',
  windowsVirtualKeyCode: <code>}` then the matching `keyUp`, ~30 ms apart. `event.repeat` stays false,
  which is what a handler that ignores auto-repeat needs.
- **Assert the result, not the absence of an exception.** Read back the markers the input should have
  produced — `document.querySelectorAll('.mark').length`, each node's `dataset`, and for an emoji drawn
  by `content: attr(data-emoji)` the computed `getComputedStyle(el, '::before').content`.

**A storage change needs the upgrade path, not just first run.** A fresh profile only ever exercises
seeding; write the *old* shape into IndexedDB (or `localStorage`) from the page, reload, and read it back
— that is the only way to see whether a re-seed kept the user's data and dropped the rows the new build no
longer ships. Return the database inside `Runtime.evaluate` with a `new Promise` + `awaitPromise: true`:
`indexedDB.open(name)` → `transaction([...])` → `getAll()` in `onsuccess`, resolving in `transaction.oncomplete`.

**Photograph it and send the file.** `Page.captureScreenshot` after
`Emulation.setDeviceMetricsOverride` at phone size, written to a PNG and attached to the reply: this
operator judges a screen by looking at it, and a repo that deploys on merge has no per-PR preview URL to
hand him instead. Say what was measured beside it; the picture is for him, the numbers are the evidence.

## What to read

Project down to a small object — never dump the DOM:

- `getBoundingClientRect()` per element: `x, y, w, h, right, bottom, cx` (`cx` is the one that proves
  **centred**: compare it with `innerWidth / 2`).
- `document.documentElement.scrollHeight` versus `innerHeight` — equal means **one screen, no scroll**.
  An element with `min-height: 100dvh` measures exactly the viewport height, which is expected, not a bug.
- `getComputedStyle(el).position` for "does this scroll away with the page" (`absolute`, not `fixed`).
- Link colours as `rgb(...)`, so an accent token is checked rather than assumed.
- **The ground may be on `html`, not `body`.** A stylesheet that sets `html { background }` leaves
  `getComputedStyle(document.body).backgroundColor` at `rgba(0, 0, 0, 0)`, which reads as "no background
  set" when the page is painted correctly. Read both elements before calling a surface missing, and compare
  the one that carries the value against the token the design names.
- **A distribution claim** — "spread across the width", "evenly spaced", "use the whole row" — is the
  container's `justify-content` plus the two edge gaps: compare `first.x - row.x` with
  `row.right - last.right`. Equal and non-zero is `space-around` (no item touches an edge); zero on both
  sides is `space-between` (the outer items are flush). Quote both numbers: "spread out" reads as
  satisfied either way, and only the pair of gaps says which one was built.
- **Presence and absence are measurements too.** Geometry answers where the nodes are, never whether the
  ones you expected are there: a page that rendered without its header measures exactly as cleanly as one
  that rendered with it, and a green type check does not compose a layout. Count what the change is about —
  `document.querySelectorAll('h1').length`, the section exists, the nav's link count — and when the change
  *removed* something, assert the count is zero **in the served artifact** (`document.querySelectorAll('.pill').length === 0`).
  A removal is a claim like any other, and the only place it is checkable is the page that ships.

## Pitfalls

- **`pkill -f "wrangler pages dev"` kills the shell running it** — the pattern matches the command line
  that contains the literal text, including a launch later in the same command. It cost two shells before
  I noticed. Use `fuser -k 8788/tcp`, or a bracket in the pattern (`pkill -f "chrom[e]-linux64"`), and
  keep the kill in its own call.
- **A promise that resolves with a DOM event never returns over CDP.** `transaction.oncomplete = resolve`
  hands the evaluator an `Event`, `returnByValue` cannot serialise it, and `Runtime.evaluate` with
  `awaitPromise: true` simply never answers — the run looks like a hung page when the page is fine. Resolve
  a primitive (`oncomplete = () => resolve(true)`) and return data you serialise yourself. Give every send a
  wall-clock timeout (`Promise.race` with an 8 s reject) so a hung call names its method instead of blocking
  the harness.
- **A framework element's height is its line box when it is a flex item.** A pill that measures 81px inline
  in the app measures 130px in a `display: flex` row with the same font-size and padding: a flex item is
  blockified, so its height is `line-height × font-size` plus padding and border, while the inline box is the
  font's content area and ignores `line-height`. "Same size as the other screen" therefore means setting
  `line-height: normal` on the container (or measuring with the same display), not copying the font-size.
  Measure both in one session and quote the pair.
- **A differing key set makes false `DIFF`s.** If one expression emits `bottom` and the other does not,
  every row looks different. Diff the intersection, or keep one expression for both pages.
- **One viewport hides a wrap.** Measure a width matrix — 360, 390 and a desktop width — and record
  `scrollWidth` at each. A row that fits at 390 can take a lone fourth item at 360, and only the matrix
  shows it; it is also how a `flex-wrap` row that is really a breakpoint decision gets caught looking
  accidental.
- **A grid or flex child's height is its row's height, not its text's.** A two-word label measures 99px
  tall because the paragraph beside it set the row, and `height / lineHeight` then invents four lines of
  wrapping that are not there. Measure wrapping with a Range over the node's contents
  (`range.getClientRects().length`) and width with `range.getBoundingClientRect().width`, or set
  `align-self: start` before reading the box. Text that is genuinely one line and box height that is
  stretched are both true at once, so read the range, not the element.
- **Re-measure after every rebuild and every server restart.** A claim is only true of the artifact you
  actually measured; the dev server may still be serving the previous build.
- **Measure the deployed artifact, not just localhost.** A Cloudflare Pages preview is built from the
  exact commit, so it is the honest thing to quote at review time; find it in the PR's deploy comment
  (`https://<short-sha>.<project>.pages.dev`, plus a branch alias `<branch>.<project>.pages.dev`).
- **After a page-visible change, re-run the site's own gates too** (`check`, `test`, `build`). Geometry
  passing says nothing about types or the test suite.
- **`elementFromPoint` answers `null` for a point outside the viewport, and `null` reads as "not
  clickable".** Hit-testing only sees what is on screen: a row measured below the fold fails every
  probe for a reason that has nothing to do with the element. `scrollIntoView({ block: 'center' })`
  before probing, and treat a run where probes are null everywhere as missing evidence rather than a
  failing target. A "click target covers the whole row" claim is exactly this test: row rect against
  anchor rect, plus a probe at each corner — never the CSS, which can be right about the selector and
  wrong about the box.
- **A focus ring cannot be checked with `element.focus()`.** Chromium's `:focus-visible` heuristic withholds
  the ring after a pointer interaction, so a programmatic focus reports `outline-width: 3px;
  outline-style: none; outline-offset: 0px` even when the rule is correct. Drive real key presses:
  `Input.dispatchKeyEvent` `rawKeyDown` then `keyUp`, `key: 'Tab'`, `code: 'Tab'`,
  `windowsVirtualKeyCode: 9`, then walk until `document.activeElement` is the target and read
  `outlineWidth`, `outlineStyle`, `outlineColor` and `outlineOffset` from it. `0px none` from a synthetic
  focus is missing evidence, not a bug — and a pointer moved earlier in the same tab keeps it missing.
- **A click selector copied from the old markup matches nothing, and reports as "nothing happened".**
  `document.querySelector(sel).click()` on `null` throws inside the evaluation, and a runner that only
  prints the returned value swallows it — the page stays where it was and the result reads as a
  navigation that did not fire. Read the served hrefs first, then drive the click from the attribute you
  found, and treat an unchanged `pathname` as a broken selector until proven otherwise.
