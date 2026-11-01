---
name: pereda-page-check
description: Exercise a Pereda PR's page and backend for real.
when-to-use: A Pereda (`aivara-se/pereda`) pull request claims page behaviour (a mode, a page, a key, a scroll or caret return) or a backend call, and the claim needs to be exercised, not read.
---

# Checking Pereda's page and backend

Gate first: `bun test`, `tinyjs build`. Then exercise the claim.

## The frontend, in a real Chromium

`browser_exec` fails here (`env: node: Permission denied`) and no playwright package is installed, but the binary is:

- `/opt/playwright/chromium-1243/chrome-linux64/chrome`
- Launch: `--headless=new --remote-debugging-port=N --no-sandbox --user-data-dir=<scratch>/profile`. Read `http://127.0.0.1:N/json/version` for `webSocketDebuggerUrl`, then drive with Node 26's `WebSocket` and `Target.createTarget` / `Target.attachToTarget` (flatten) / `Runtime.evaluate` (`awaitPromise: true, returnByValue: true, userGesture: true`).

Copy `src/` to a scratch `site/` and serve it (`python3 -m http.server 8901`) so the URL is `/src/frontend/index.html`.

- **Serve a root that holds `src/` whole:** `app.js` imports `../shared/*`; a root missing them 404s every module, the page renders nothing and raises no visible exception — it reads like an app bug.
- Insert `<script src="tiny-stub.js"></script>` before the module script in `index.html`, and stub `tiny`: `system.os`, `hotkey.on`, `win.*`, `api.call` (fake `openLog`/`saveDay`/`exportNotes`), `api.on`, and `dialog.pickFolder()` resolved by hand through `window.__resolvePick(value)`.
- Chrome blocks `file://` ES modules — use the http server.
- Keys: `document.dispatchEvent(new KeyboardEvent('keydown', {...}))`. The handler is on `document`; `keyAction` reads `metaKey`/`ctrlKey`.

## The backend, under the real runtime

`/root/.tinyjs/bin/tjs run <script>` is txiki 26.6.0, the version the app bundles.

- Import by path relative to the script (`./src/backend/main.js`); `file:///...` specifiers fail to load.
- `import { api } from './src/backend/main.js'` with a fake `app`: `{ paths: async () => ({ data }) }`. Open the store with `openStore(path, (p) => new Database(p))`, save rows with `seq: 1`.
- `tjs.readDir` returns a `DirHandle`, not an array: `for await (const e of await tjs.readDir(dir))`.
- `tjs.writeFile` replaces an existing file and encodes UTF-8 — what the export's "verbatim, replaced" claim rests on.

## What cannot be checked here

The built app exits at once under `xvfb-run` at every head, so it is not a regression signal: the window, the native picker and the export stay the author's hand check. Say so in the review rather than implying it ran.
