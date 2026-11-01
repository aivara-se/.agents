# Driving the page over a stubbed bridge

Use when the behaviour lives in the page — modes, focus, layout, opacity — and the built app is slow to drive. The page is the real `src/frontend`; only the `tiny` bridge is faked.

## Recipe

- Serve the app's `src` root from a throwaway script outside the repository, with content types for `.js`, `.css` and `.woff2`. The entry is `/frontend/index.html`; serving `src/frontend` alone 404s every `../shared/` import.
- With a global Playwright, `NODE_PATH=$(npm root -g)` resolves `require('playwright')` from a script outside the repository. Launch with `--no-sandbox` when the check runs as root.
- Stop the harness server by its recorded pid. `pkill -f '<port>'` also matches the shell carrying the pattern, so the command kills itself.
- `page.addInitScript` defines `window.tiny` before the module runs: `api.call(name, params)` answers fixed payloads, `api.on` stores handlers, plus `hotkey.on`, `dialog.confirm`, `win` and `system.os`.
- Stub the backend's rules, not only its values: the log's page (today first even when empty), the search bound (today excluded), the save reply's `today`, the jump's page of days. Convenient arrays prove the page reads fields, not that it handles the contract.
- Expose the fake store and `__emit(event)` on `window`, so a check can seed a note or fire a menu event.
- Drive with `keyboard.press`, `fill`, `focus` and `click`; wait on a selector or a promise, never a fixed sleep where an event exists.

## Assert

- Mode state with what a person sees: `hidden`, `aria-expanded`, `activeElement.id`, `value`, a `body` class.
- Geometry with `getBoundingClientRect()`: a control's edge within a pixel of its owner's, and the owner's height identical before and after focus — the proof a row is out of flow.
- Paint with `getComputedStyle`: `opacity`, `visibility`; wait past the CSS transition before reading.
- A view that replaces a scroll container: set `scrollTop`, open the view, close it, compare `scrollTop` and `activeElement`; hiding only the contents returns at the top.
- Pin the negative case: a query that must exclude today gets today's note seeded, and the result list asserted empty.
- Collect `pageerror` and `console` errors and assert none.

## Pitfalls

- A `visibility: hidden` control is not clickable; focus its owner first, then click.
- `document.hasFocus()` is true in headless Chromium, so a fade gated on window focus shows there. Read that as a contract check; the Xvfb run covers the real window.
- A stubbed `saveDay` that ignores the counter hides stale-write behaviour; answer the counter the page sent.
- Capture `dialog.confirm`'s arguments in the stub and assert the title, detail and button labels: the native dialog is the one part the harness cannot show.
- Keep `docs/screenshot.png` honest by capturing it from the same harness: seed the shipped entries, wait for fonts, shoot at the size in `tinyjs.json` and once at the narrow breakpoint.
- Keep the harness and its `node_modules` outside the repository: it is a check, not a dependency.

## What it does not prove

The real webview, bundled fonts, transparency, the global hotkey, native dialogs and the data folder. Finish with the built app under Xvfb (`headless-run.md`).
