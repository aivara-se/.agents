# Driving the page over a stubbed bridge

Use when the behaviour lives in the page — modes, focus, layout, opacity — and the built app is slow to drive. The page is the real `src/frontend`; only the `tiny` bridge is faked.

## Recipe

- Serve `src/frontend` from a throwaway script outside the repository, with content types for `.js`, `.css` and `.woff2`.
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
- Keep the harness and its `node_modules` outside the repository: it is a check, not a dependency.

## What it does not prove

The real webview, bundled fonts, transparency, the global hotkey, native dialogs and the data folder. Finish with the built app under Xvfb (`headless-run.md`).
