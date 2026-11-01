---
name: pereda-page-check
description: Exercise a Pereda PR's page and backend for real.
when-to-use: A Pereda (`aivara-se/pereda`) pull request claims page behaviour (a mode, a page, a key, a scroll or caret return) or a backend call, and the claim needs to be exercised, not read.
---

# Checking Pereda's page and backend

Run the gate first: `bun test`, `tinyjs build`. Then exercise the claim.

## The frontend, in a real Chromium

`browser_exec` cannot start here (`env: node: Permission denied`), and no playwright
package is installed — but the browser binary is:

- `/opt/playwright/chromium-1243/chrome-linux64/chrome`
- Drive it over CDP: launch with `--headless=new --remote-debugging-port=N --no-sandbox
  --user-data-dir=<scratch>/profile`, read `http://127.0.0.1:N/json/version` for
  `webSocketDebuggerUrl`, and use Node 26's built-in `WebSocket` plus
  `Target.createTarget` / `Target.attachToTarget` (flatten) / `Runtime.evaluate`
  (`awaitPromise: true, returnByValue: true, userGesture: true`).

Copy `src/` to a scratch `site/` and serve it (`python3 -m http.server 8901` from
`site/`) so the URL is `/src/frontend/index.html`.

- Serve from a root that holds `src/` whole: `app.js` imports `../shared/*`, and a
  root missing them 404s every module — the page then renders nothing and raises
  no visible exception, which reads like an app bug.
- Insert `<script src="tiny-stub.js"></script>` before the module script in
  `index.html`, and stub `tiny` in that file: `system.os`, `hotkey.on`, `win.*`,
  `api.call` (a fake `openLog`/`saveDay`/`exportNotes`), `api.on`, and
  `dialog.pickFolder()` resolved by hand through `window.__resolvePick(value)`.
- Chrome blocks `file://` ES modules; always use the http server.
- Dispatch keys with `document.dispatchEvent(new KeyboardEvent('keydown', {...}))`;
  the handler is on `document` and `keyAction` reads `metaKey`/`ctrlKey`.

## The backend, under the real runtime

`/root/.tinyjs/bin/tjs run <script>` is txiki 26.6.0, the version the app bundles.

- Import with paths relative to the script (`./src/backend/main.js`); `file:///...`
  specifiers fail to load.
- `import { api } from './src/backend/main.js'` and pass a fake `app`:
  `{ paths: async () => ({ data }) }`. Open the store with
  `openStore(path, (p) => new Database(p))` and save rows with `seq: 1`.
- `tjs.readDir` returns a `DirHandle`, not an array: `for await (const e of await tjs.readDir(dir))`.
- `tjs.writeFile` replaces an existing file and encodes strings as UTF-8, which is
  what the export's "verbatim, replaced" claim rests on.

## What cannot be checked here

The built app exits at once under `xvfb-run` at every head (main included), so it
is not a regression signal and the window, the native picker and the export in the
built app stay the author's hand check. Say so in the review rather than implying
it ran.
