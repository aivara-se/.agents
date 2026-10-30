# Browser checks with Playwright

## Setup

- `bun add -g playwright && playwright install chromium` — a global install keeps the app's dependencies clean, because the checks are a harness, not part of the app.
- **Find the browser before installing one.** `playwright install chromium` can exit 0 having downloaded nothing, because the browsers are already on the machine under a non-default `PLAYWRIGHT_BROWSERS_PATH`. The tell is that it prints no progress and `~/.cache/ms-playwright` is never created. Look for what is already there — `find / -maxdepth 6 -name 'chrome-linux*'` (e.g. `/opt/playwright/chromium-1248/chrome-linux64`) — and run every check with `PLAYWRIGHT_BROWSERS_PATH=<that parent>`. Confirm with one throwaway launch before writing the harness. **When the installed Playwright package version and that browser revision disagree, `PLAYWRIGHT_BROWSERS_PATH` is not enough** — `launch()` resolves the revision the package expects and dies on the mismatch. Pass `executablePath` at the binary you found (e.g. `/opt/playwright/chromium-1248/chrome-linux64/chrome`): it uses exactly that binary and skips the revision lookup, so a current package drives an older installed browser with nothing downloaded.
- **Run the harness from a scratch directory, not the repository.** Symlink the global package rather than installing a second copy: `mkdir -p /tmp/<harness>/node_modules && ln -s ~/.bun/install/global/node_modules/playwright /tmp/<harness>/node_modules/playwright`, the same for `playwright-core`, plus a `package.json` carrying `"type": "module"`. Node resolves a symlink to its real path, so `import { chromium } from "playwright"` works with nothing downloaded and the app's tree stays clean. Keep it outside the tree outright when the repository's own docs say the browser checks are not part of its gate — the repository's convention beats a preference for committing the harness.
- `chromium.launch({ args: ["--no-sandbox"] })` when running as root. A headed window needs `Xvfb :99 -screen 0 1280x800x24` plus `DISPLAY=:99` (start Xvfb as a tracked background process, not with `nohup`/`&`).
- Serve the tree from inside the same script (`Bun.serve`) so one command runs the whole check, and `server.stop(true)` at the end. When the repository already ships its own server script, **spawn that** instead of duplicating it (`Bun.spawn(["bun", "run", "scripts/serve.ts"], { cwd: ROOT, env: { ...process.env, PORT } })`, then poll `fetch` until it answers) so the check exercises the real serve path and its content-type map.
- **A seeded data file is a new media type on the server's map.** Serving JSON as `application/octet-stream` still works — the app calls `.json()` on the response and the parser ignores the header — so the app passes and only the content-type assertion fails. Add the type and keep the assertion.

## Measuring a response time

Install both probes in the page **before** the action, then read once:

```js
await page.evaluate(() => {
  window.__t = { down: 0, shown: 0 };
  addEventListener("keydown", (e) => { if (e.key === "k" && !window.__t.down) window.__t.down = performance.now(); }, true);
  new MutationObserver(() => { if (!window.__t.shown) window.__t.shown = performance.now(); })
    .observe(document.querySelector("#screen"), { childList: true, subtree: true, characterData: true });
});
await page.keyboard.press("k");
await page.waitForTimeout(200);
const ms = await page.evaluate(() => window.__t.shown - window.__t.down);
```

Polling `page.evaluate` in a loop instead reports the driver round-trip (tens of ms), not the app.

## Proving every item landed, not just the last one

The final string says nothing about the path to it: a rule that delays or drops
a character still ends at the same text once the last key is slow enough.
Record the length on every change and assert the sequence:

```js
await page.evaluate(() => {
  window.__lens = [];
  new MutationObserver(() => window.__lens.push(document.querySelector("#screen").textContent.length))
    .observe(document.querySelector("#screen"), { childList: true, subtree: true, characterData: true });
});
for (const key of "abcdefghij") await page.keyboard.press(key);
const grown = [...new Set(await page.evaluate(() => window.__lens))];
```

`grown` equal to `[1,2,…,10]` is the claim "every character appears as its key
lands"; a `[1,2,3,10]` is a batch. Do not count inside the loop — an `evaluate`
per key adds a round trip and changes the very timing under test.

## Measuring the gap you can see, not the one you set

The padding you write in CSS is not the space the eye sees. A font reserves
empty ascent and descent above and below the glyph ink, and the glyphs carry
their own side bearings, so a bordered chip padded evenly on all four sides
reads top-heavy and he will say the top space is too big.

Measure the ink, from the rendered pixels:

```js
const b64 = (await page.locator(".mark").screenshot()).toString("base64");
const runs = await page.evaluate(async (b64) => {
  const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
  const dark = (x, y) => { const i = (y * width + x) * 4; return data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 100; };
  const out = [];
  let s = null;
  for (let x = 0; x < width; x++) {
    const d = dark(x, Math.round(height / 2));
    if (d && s === null) s = x;
    if (!d && s !== null) { out.push([s, x - 1]); s = null; }
  }
  return out;
}, b64);
```

The first run is the border and the last is the border on the far side; the
space between the border and the first ink run is the visible side gap. Scan
the middle row — that is where a vertical border is a clean run and the tallest
letter still shows ink.

Two instruments that lie, both tried before this one:

- **Canvas metrics.** `ctx.measureText().actualBoundingBoxLeft/Right` do not
  line up with the rendered ink: they reported a 37 px right gap where the
  pixels showed 23 px. Never size a box from them.
- **An ink bounding box scanned naively inside the border box.** With a rounded
  border the corner arcs are dark pixels a few pixels in from the top and
  bottom edges, so a bbox that starts just inside the border picks them up and
  reports ~1 px on every side. Scan a row at the vertical midline, or exclude
  the corner bands.

When a measurement surprises you, print the pixels as a coarse ASCII map before
believing it — one character per 4 px across and 8 px down names the border,
the corner arcs and the letters at a glance:

```js
const map = [];
for (let y = 0; y < height; y += 8) {
  let line = "";
  for (let x = 0; x < width; x += 4) line += dark(x, y) ? "#" : ".";
  map.push(line);
}
```

## A behaviour whose only evidence is sound

Audio is not in the DOM, so assert the call. Patch `play` before the action and
count how many start:

```js
await page.evaluate(() => {
  window.__plays = 0;
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...args) {
    window.__plays++;
    return play.apply(this, args).catch(() => {});
  };
});
// … press keys quickly …
const during = await page.evaluate(() => window.__plays);
await page.waitForTimeout(400);
const after = await page.evaluate(() => window.__plays);
```

`during === 0 && after === 1` is exactly the claim "fast input is written but
not spoken, and the last letter speaks once it stops". Keep the `.catch()` in
the wrapper: a headless browser has no audio device, the play promise rejects,
and an unhandled rejection fails your own console-error check.

## Checking the rendered result

- **Geometry**: `getBoundingClientRect()` on the elements, then assert the numbers. This is the only way to check position and alignment when you cannot see the image.
- **Text**: read `textContent` and compare to the expected string exactly.
- **Errors**: `page.on("console", m => m.type() === "error" && errors.push(...))` and `page.on("pageerror", ...)`, then assert the list is empty.
- **Hidden state**: read the computed `display` of the panels that should be gone after the action that hides them.
- **A display-only effect**: toggle the property at runtime and compare the painted box, then assert the DOM text is untouched — with `el.style.textTransform = "none"` the rendered width drops while `range.toString()` still reads the lower-case word the user typed. That is what keeps a `text-transform` from quietly becoming an edit.
- **Animation**: asserting `animationName` proves only that the rule parsed. Sample the animated value across the cycle and require both that the samples differ and that the extremes are the ones the design claims — reads of `getComputedStyle(el).opacity` 70–100 ms apart over more than one cycle, then `Math.min(...samples) <= 0.05` for a fade that is meant to reach nothing.
- **Animation shape**: read the keyframes the browser is actually running — `document.getAnimations().find(a => a.animationName === X).effect.getKeyframes()` gives `{ offset, opacity, easing }` per frame. Compare the values against the curve you meant (`(1 + Math.cos(2 * Math.PI * offset)) / 2`) and require the easing to match. This is exact, and it is the only way to make a shape claim: live samples jitter too much to prove a curve.
- **Do not write a check asserting your animation stops.** Sampling under `page.emulateMedia({ reducedMotion: "reduce" })` to prove it switches off pins the bug rather than the feature: his device reports reduce-motion, so the check would guard the state he reports as broken. If the animation is the point of the element, assert it still runs there.

## The failures these checks miss

- **A harness that prints its results only at the end.** One throw anywhere — a `.top` off an empty range, a missing element — aborts the script before the summary, and every check that passed is lost with the run. Print each result the moment it settles (a `console.log` inside the `check()` helper) so a mid-run failure still shows what stood, and count the lines (`grep -c '^PASS'`) instead of trusting the tail.
- **A key event the driver cannot produce.** Playwright sends the `key` its key table holds for the name you give, so a bug that depends on `key` changing between keydown and keyup cannot be reached with `down`/`press` — it will look like the bug does not reproduce. Dispatch `new KeyboardEvent("keydown", { key: "A", code: "KeyA" })` and a keyup carrying `key: "a"` for the same code, and assert the app keys off `event.code`.

- **A fresh tab hides service-worker staleness** — see `service-worker.md`.
- **A probe that tests the user agent, not your code** — a fresh `<div hidden>` is `display:none` from the UA stylesheet whether or not you wrote the rule. Probe the served CSS or an element your rule actually governs.
- **A check that measures the wrong thing.** A length from `getComputedStyle` is already in pixels, so multiplying `lineHeight` by `fontSize` yields a huge number and every comparison against it passes — read the computed value as-is. A tolerance that was right before a legitimate layout change is now too tight. When a check fails straight after a change you meant, suspect the check before the app, then fix the check.
- **A check that outlived the screen it drove.** Removing or renaming a control (a start button, a Stop button) breaks every script that clicks it, and the failure reads as a timeout on a locator, not as a stale harness. Grep the check scripts for the id in the same change that removes it.
