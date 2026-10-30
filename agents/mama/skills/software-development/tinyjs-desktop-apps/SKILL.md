---
name: tinyjs-desktop-apps
description: Use when building a tinyjs desktop app.
when-to-use: A repository with a `tinyjs.json` at its root, or a task deciding whether a desktop app should be built on tinyjs.
version: 0.1.0
author: MaMa
license: MIT
metadata:
  hermes:
    tags: [tinyjs, desktop, sqlite, packaging]
    related_skills: [coding, testing, aivara-se-workflow]
---

# tinyjs desktop apps

tinyjs is a desktop shell: a JavaScript backend on txiki.js and a native launcher that shows the page in the OS webview. The two talk over a private socket in a temp folder; there is no HTTP server and no port. The backend has files, processes and SQLite; the page has none and reaches them through named `api` calls. `references/framework.md` maps the API, the config keys, the build and the gotchas; read it before the first line of code, and read the docs for the installed version because the details move between releases.

## When to Use

- A repository carries `tinyjs.json` at its root.
- A task decides whether a desktop app should use tinyjs.
- A review checks a tinyjs app's data, packaging or no-network promise.

Not for a web app, a Tauri app, or a general Electron question.

## Ground first

- Read `tinyjs.json`, the product document and the version's docs. `https://tinyjs.app/llms.txt` indexes every page and `llms-full.txt` is all of them.
- Pin `minTinyjsVersion`; a tinyjs upgrade is a reviewed change, not a `latest` tag.
- Choose the app `id` before release. It names the data folder, the OS identity and single-instance detection; changing it starts every user empty.

## Shape

- The plain template is `src/backend/main.js` (or `.ts`), `src/frontend/` with an `index.html` plus JS and CSS, an icon in the project's assets folder, and `tinyjs.json`. The Vite templates add a frontend build and a framework; take one only when the page needs it, because the size and dependency surface grow with it.
- The page loads as a real `file://` document and has no `tjs`. Do not hand it a general `exec` or `query` call: every page the app loads can call anything in `api`, so expose named operations only.
- A page from a site you do not control makes the app a site wrapper, and only then is the `api` gate in `tinyjs.json` mandatory. Do not load one in a local-first app.

## Data

- Durable data goes in `(await app.paths()).data`. Never a relative path: `./` is the process working directory, which is often `/` in a built app. `paths()` creates the folder.
- SQLite is built in (`tjs:sqlite`) and synchronous; `tjs.*` file calls are async. Await `makeDir` before opening a database.
- Autosave a whole document with a monotonic sequence: never delete the row; write an empty body as a tombstone, and make the upsert conditional on the incoming sequence being greater than the stored one. A late write then cannot resurrect a cleared document, and a delete keeps the sequence that makes that true. Test the stale sequence explicitly.
- WAL and `synchronous=FULL` are what let a committed save survive a power loss, at one flush per save. Keep the debounce in the system document and do not promise a keystroke the debounce can lose.

## Local-only promises

- "No network" rules out the auto-update check: `update.url` and `tinyjs publish` fetch a manifest. Omit the `update` block and ship downloads; adding a check later is a new decision with a new exception.
- Prove it with the network off on the built app. A green build says nothing about a request.
- Dialogs are page-only (`tiny.dialog.pickFolder`, `saveFile`); reading and writing the chosen path is the backend's. Never let the page touch the filesystem directly.
- A local app's "real-time" means save-as-you-type on this machine, not another device seeing it. Cross-device live means a sync service; scope it to a later version or leave it out of v1.

## Ship

- `tinyjs build` builds for the OS it runs on; macOS, Windows and Linux need three runners. macOS first install needs a Developer ID signature and notarization; `--dmg` packages the app. Windows and Linux signing is a separate certificate decision.
- `tinyjs dev` hot-reloads the page and restarts the backend; `tinyjs doctor` diagnoses a setup that will not run.
- Test pure logic with `bun test`; test the SQLite store with `bun:sqlite` against the same SQL, injecting the `Database` so the backend opens `tjs:sqlite`. The webview, native dialogs, the real data folder and the signed bundle are checked by hand on each release — headless, with `references/verifying-a-build.md`.
- `mock.module('tjs:sqlite', () => ({ Database }))` imports `src/backend/main.js` under `bun test`, so the `api` calls themselves run against a real store: walk a paging loop over a hundred days and count duplicates and gaps.
- The page is reachable too: a stub `document`, `window` and `tiny` around `src/frontend/app.js` drives its own handlers, which reproduces a wrong status line or a colliding counter without a webview.

## Pitfalls

- No `node:*` modules and no package that needs them; txiki.js is not Node. A TypeScript backend bundles npm packages with esbuild only when they avoid Node's built-ins.
- `import.meta.url` throws in a built app; find shipped files through `app.paths().resources` and `executables`, not the module path.
- A hidden or covered webview throttles timers; do continuous work in the backend and push events to the page.
- `tinyjs build` empties `dist/` first; never keep an artifact you need there.
