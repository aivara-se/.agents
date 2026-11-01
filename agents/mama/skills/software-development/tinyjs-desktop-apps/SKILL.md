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

tinyjs is a desktop shell: a JavaScript backend on txiki.js and a native launcher showing the page in the OS webview, talking over a private socket — no HTTP server, no port. The backend has files, processes and SQLite; the page has none and reaches them through named `api` calls.

Use it for a repo with `tinyjs.json` at its root, for a decision about building a desktop app on tinyjs, or for a review of a tinyjs app's data, packaging or no-network promise. Not for a web app, a Tauri app, or a general Electron question.

`references/framework.md` maps the API, config keys, build and gotchas; read it before the first line of code, and read the docs for the installed version.

## Ground first

- Read `tinyjs.json`, the product document and the version's docs. `https://tinyjs.app/llms.txt` indexes every page; `llms-full.txt` is all of them.
- Pin `minTinyjsVersion`; a tinyjs upgrade is a reviewed change, not a `latest` tag.
- Choose the app `id` before release. It names the data folder, the OS identity and single-instance detection, so changing it starts every user empty.

## Shape

- Plain template: `src/backend/main.js` (or `.ts`), `src/frontend/` with an `index.html` plus JS and CSS, an icon, and `tinyjs.json`. The Vite templates add a frontend build and a framework — take one only when the page needs it.
- The page is a real `file://` document with no `tjs`. Every page the app loads can call anything in `api`, so expose named operations only; never a general `exec` or `query`. A page from a site you do not control makes the app a site wrapper, and only then is the `api` gate in `tinyjs.json` mandatory.

## Data

- Durable data goes in `(await app.paths()).data`. Never a relative path: `./` is the process working directory, often `/` in a built app. `paths()` creates the folder.
- SQLite is built in (`tjs:sqlite`) and synchronous; `tjs.*` file calls are async. Await `makeDir` before opening a database.
- Autosave a whole document with a monotonic sequence: never delete the row; write an empty body as a tombstone, and make the upsert conditional on the incoming sequence being greater than the stored one. A late write then cannot resurrect a cleared document, and a delete keeps the sequence that makes that true. Test the stale sequence explicitly.
- WAL plus `synchronous=FULL` is what lets a committed save survive a power loss, at one flush per save. Keep the debounce in the system document and never promise a keystroke the debounce can lose.

## Local-only promises

- "No network" rules out the auto-update check: `update.url` and `tinyjs publish` fetch a manifest. Omit the `update` block and ship downloads; adding a check later is a new decision with a new exception.
- Prove it with the network off on the built app. A green build says nothing about a request.
- Dialogs are page-only (`tiny.dialog.pickFolder`, `saveFile`); reading and writing the chosen path is the backend's.
- "Real-time" in a local app means save-as-you-type on this machine, not another device seeing it. Cross-device live needs a sync service — scope it later or leave it out of v1.

## Ship

- `tinyjs build` builds for the OS it runs on; three OSes need three runners. A macOS first install needs a Developer ID signature and notarization; `--dmg` packages the app. Windows and Linux signing is a separate certificate decision.
- `tinyjs dev` hot-reloads the page and restarts the backend; `tinyjs doctor` diagnoses a setup that will not run.
- Test pure logic with `bun test`; test the store with `bun:sqlite` against the same SQL, injecting the `Database`. Then `mock.module('tjs:sqlite', () => ({ Database }))` imports `src/backend/main.js` under `bun test`, so the `api` calls run against a real store — walk a paging loop over a hundred days and count duplicates and gaps. A stub `document`, `window` and `tiny` around `src/frontend/app.js` drives the page handlers and reproduces a wrong status line without a webview.
- Check the webview, native dialogs, real data folder and signed bundle by hand on each release — headless, with `references/verifying-a-build.md`.

## Pitfalls

- **A menu item is not cross-platform on a frameless or transparent window.** Windows draws no menu bar for one ("frameless and transparent windows can't show a menu bar", tinyjs.app/docs/menus), so `menu.set` succeeds and nothing is visible. Give Windows a page-drawn control, or record the gap in the product document — never write "everywhere".
- **txiki.js is not Node.** No `node:*` modules, and `import.meta.url` throws in a built app — find shipped files through `app.paths().resources` and `executables`.
- **A hidden or covered webview throttles timers.** Do continuous work in the backend and push events to the page. The full gotcha list is in `references/framework.md`.
