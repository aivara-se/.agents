# Browser checks for a web front-end

Unit tests cover pure logic. A screen, a keyboard, a service worker and speech exist only in a browser. Run those in real Chrome, driven by Playwright, against a copy served from the check itself.

## Set up a browser

- Install once, outside the repository so it is not a project dependency: `bun add -g playwright && playwright install chromium`.
- Launch with `--no-sandbox` when the process is root in a container.
- `headless: true` covers the DOM, key events, service workers and offline reloads. Use `headless: false` with `Xvfb :99` and `DISPLAY=:99` only when the check needs a real window: fullscreen, PWA install or platform speech voices. Headless Chrome reports no speech voices, even with a TTS engine installed.

## Serve from the check script

`Bun.serve` in the script that drives the browser keeps the run self-contained. Map the request path to a file, default `/` to `index.html`, set the content-type from the extension, and 404 the rest. A service worker and `localStorage` need a real origin (`http://localhost:<port>`), never `file://`.

## Drive and measure

- Input: `page.keyboard.down/up/press` sends real key events to the page.
- Latency: measure inside the page, not from the driver. Install a capture-phase `keydown` listener and a `MutationObserver` on the target, stamp both with `performance.now()`, press, then read the difference. A driver-side poll adds round-trip noise and reports a tight budget as blown when it is not.
- Geometry: assert with `getBoundingClientRect()`, an element's edge against a fraction of the viewport. It is the only check available when you cannot view images.
- Offline: `context.setOffline(true)`, then `page.reload()`, and assert the app still renders. That proves the precache; a cache header does not.
- Errors: collect `page.on("console")` entries of type `error` and `page.on("pageerror")`, and assert none.
- Assets: `page.setContent()` plus `page.screenshot({ type: "png" })` at the target sizes renders icons and evidence with no image library.

## Prove a visual fix

- Build both trees. Put the base commit in its own worktree (`git worktree add ../before origin/main`) and build it there, then build the fixed tree as usual.
- Serve each build on its own port: `python3 -m http.server 8787 -d <app>/build`. Localhost is a secure origin, so a service worker or OPFS behaves as in production.
- Drive both with one script and one input. Read the changed text from the DOM as well as shooting it, with `page.$eval(sel, (n) => n.textContent.trim())`.
- The pair is evidence only when the fix is the one thing that differs. Same viewport and `deviceScaleFactor`, a fresh context per origin, the same data typed into each.
- Give each half a caption and compose the two into one image:

```bash
montage -background '#fff' -pointsize 24 -label before a.png -label after b.png -tile 2x1 -geometry +16+16 pair.png
convert pair.png -resize 2400x -depth 8 -strip pair.png
```

- Look at the composed image before you send it. Crop to what changed when the window is mostly empty.

## Pitfalls

- A check that asserts nothing happened must start clean. A suppression test that begins on a screen already holding text fails for the wrong reason. Reload first, and assert the screen is empty, not merely unchanged.
- One `console` error fails the "no console error" check, and a missing asset logs one. Guard the code that requests it rather than weakening the check.
- **A property a `transition` carries reads its old value until the transition ends.** A row that leaves on `visibility 0s var(--t-soft)` is still `visible` a millisecond after its blur. An immediate read then asserts the state before the change. Read `transitionDuration` for the element, wait it, then assert; never shorten the app's fade to satisfy an impatient check.
