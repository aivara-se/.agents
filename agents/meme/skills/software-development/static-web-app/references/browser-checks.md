# Browser checks with Playwright

## Setup

- `bun add -g playwright && playwright install chromium` — global, so the app's dependencies stay clean.
- **Find the browser before installing one.** `playwright install chromium` can exit 0 having downloaded nothing, because the browsers are already on the machine under a non-default `PLAYWRIGHT_BROWSERS_PATH`. The tell is no progress and no `~/.cache/ms-playwright`. Look first — `find / -maxdepth 6 -name 'chrome-linux*'` (e.g. `/opt/playwright/chromium-1248/chrome-linux64`) — and run every check with `PLAYWRIGHT_BROWSERS_PATH=<that parent>`. **When the package version and that revision disagree, the variable is not enough**: `launch()` resolves the revision the package expects and dies. Pass `executablePath` at the binary found.
- **Run the harness from a scratch directory, not the repository.** Symlink the global package: `mkdir -p /tmp/<harness>/node_modules && ln -s ~/.bun/install/global/node_modules/playwright /tmp/<harness>/node_modules/playwright`, the same for `playwright-core`, plus a `package.json` with `"type": "module"`. Node resolves the symlink to its real path, so the import works and the app's tree stays clean. Keep it outside outright when the repository's docs say the checks are not part of its gate.
- `chromium.launch({ args: ["--no-sandbox"] })` as root. A headed window needs `Xvfb :99 -screen 0 1280x800x24` plus `DISPLAY=:99`, started as a tracked background process.
- Serve the tree inside the same script (`Bun.serve`), with `server.stop(true)` at the end. When the repository ships a server script, **spawn that** (`Bun.spawn(["bun", "run", "scripts/serve.ts"], { cwd: ROOT, env: { ...process.env, PORT } })`, then poll `fetch` until it answers), so the check exercises the real content-type map.
- **A seeded data file is a new media type on that map.** JSON served as `application/octet-stream` still works — the app calls `.json()` and the parser ignores the header — so only the content-type assertion fails. Add the type and keep the assertion.

## Measuring a response time

Install both probes in the page **before** the action, then read once:

```js
await page.evaluate(() => {
  window.__t = { down: 0, shown: 0 };
  addEventListener(
    "keydown",
    (e) => {
      if (e.key === "k" && !window.__t.down)
        window.__t.down = performance.now();
    },
    true,
  );
  new MutationObserver(() => {
    if (!window.__t.shown) window.__t.shown = performance.now();
  }).observe(document.querySelector("#screen"), {
    childList: true,
    subtree: true,
    characterData: true,
  });
});
await page.keyboard.press("k");
await page.waitForTimeout(200);
const ms = await page.evaluate(() => window.__t.shown - window.__t.down);
```

Polling `page.evaluate` in a loop reports the driver round-trip, not the app.

## Proving every item landed, not just the last one

A rule that delays or drops a character still ends at the same final string. Record the length on every change:

```js
await page.evaluate(() => {
  window.__lens = [];
  new MutationObserver(() =>
    window.__lens.push(document.querySelector("#screen").textContent.length),
  ).observe(document.querySelector("#screen"), {
    childList: true,
    subtree: true,
    characterData: true,
  });
});
for (const key of "abcdefghij") await page.keyboard.press(key);
const grown = [...new Set(await page.evaluate(() => window.__lens))];
```

`[1,2,…,10]` is "every character appears as its key lands"; `[1,2,3,10]` is a batch. Do not count inside the loop — an `evaluate` per key changes the timing under test.

## Measuring the gap you can see, not the one you set

A font reserves ascent and descent above and below the glyph ink, and glyphs carry side bearings, so a chip padded evenly on all four sides reads top-heavy. Measure the ink:

```js
const b64 = (await page.locator(".mark").screenshot()).toString("base64");
const runs = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = "data:image/png;base64," + b64;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
  const dark = (x, y) => {
    const i = (y * width + x) * 4;
    return data[i] < 100 && data[i + 1] < 100 && data[i + 2] < 100;
  };
  const out = [];
  let s = null;
  for (let x = 0; x < width; x++) {
    const d = dark(x, Math.round(height / 2));
    if (d && s === null) s = x;
    if (!d && s !== null) {
      out.push([s, x - 1]);
      s = null;
    }
  }
  return out;
}, b64);
```

The first run is the near border, the last the far one; the space between a border and the first ink run is the visible side gap. Scan the middle row.

Two instruments that lie:

- **Canvas metrics.** `ctx.measureText().actualBoundingBoxLeft/Right` do not match the rendered ink: they reported a 37 px right gap where the pixels showed 23 px.
- **An ink box scanned naively inside the border box.** A rounded border's corner arcs are dark, so a bbox starting just inside picks them up and reports ~1 px everywhere. Scan the vertical midline, or exclude the corner bands.

When a measurement surprises you, print the pixels as a coarse ASCII map — one character per 4 px across and 8 px down:

```js
const map = [];
for (let y = 0; y < height; y += 8) {
  let line = "";
  for (let x = 0; x < width; x += 4) line += dark(x, y) ? "#" : ".";
  map.push(line);
}
```

## A behaviour whose only evidence is sound

Audio is not in the DOM, so assert the call. Patch `play` before the action and count the starts:

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

`during === 0 && after === 1` is "fast input is written but not spoken, and the last letter speaks once it stops". Keep the `.catch()`: a headless browser has no audio device, the promise rejects, and an unhandled rejection fails your console-error check.

## Checking the rendered result

- **Geometry**: `getBoundingClientRect()`, then assert the numbers — the only way to check position and alignment when you cannot see the image.
- **Text**: `textContent`, compared to the expected string exactly.
- **Errors**: `page.on("console", m => m.type() === "error" && errors.push(...))` and `page.on("pageerror", ...)`, then assert the list is empty.
- **Hidden state**: the computed `display` of panels that should be gone.
- **A display-only effect**: toggle the property at runtime and compare the painted box, then assert the text is untouched — with `el.style.textTransform = "none"` the width drops while `range.toString()` still reads the lower-case word the user typed.
- **Animation**: `animationName` proves only that the rule parsed. Sample the value across the cycle and require the samples to differ and the extremes to be the design's — `getComputedStyle(el).opacity` 70–100 ms apart over more than one cycle, then `Math.min(...samples) <= 0.05` for a fade meant to reach nothing.
- **Animation shape**: `document.getAnimations().find(a => a.animationName === X).effect.getKeyframes()` gives `{ offset, opacity, easing }` per frame. Compare against `(1 + Math.cos(2 * Math.PI * offset)) / 2` and require the easing; live samples jitter too much to prove a curve.
- **Do not write a check asserting your animation stops.** Sampling under `page.emulateMedia({ reducedMotion: "reduce" })` to prove it switches off pins the bug: his device reports reduce-motion, so the check guards the state he reports as broken.

## The failures these checks miss

- **A harness that prints its results only at the end.** One throw aborts the script and every pass is lost. Print each result as it settles (a `console.log` inside the `check()` helper) and count the lines (`grep -c '^PASS'`).
- **A key event the driver cannot produce.** Playwright sends the `key` its table holds, so a bug that depends on `key` changing between keydown and keyup looks like it does not reproduce. Dispatch `new KeyboardEvent("keydown", { key: "A", code: "KeyA" })` and a keyup carrying `key: "a"` for the same code, and assert the app keys off `event.code`.
- **A fresh tab hides service-worker staleness** — see `service-worker.md`.
- **A probe that tests the user agent, not your code** — a fresh `<div hidden>` is `display:none` either way. Probe the served CSS or an element your rule governs.
- **A check that measures the wrong thing.** A length from `getComputedStyle` is already in pixels, so multiplying `lineHeight` by `fontSize` makes every comparison pass. When a check fails straight after a change you meant, suspect the check first.
- **A check that outlived the screen it drove.** Removing or renaming a control breaks every script that clicks it, and the failure reads as a locator timeout. Grep the check scripts for the id in the same change.
