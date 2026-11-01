---
name: tinyjs-desktop-apps
description: Use when building a tinyjs desktop app.
when-to-use: A repository with a `tinyjs.json` at its root, a task deciding whether a desktop app should be built on tinyjs, or a local-first app gaining an account-backed destination.
version: 0.1.0
author: MaMa
license: MIT
metadata:
  hermes:
    tags: [tinyjs, desktop, sqlite, packaging]
    related_skills: [coding, testing, aivara-se-workflow]
---

# tinyjs desktop apps

tinyjs is a desktop shell: a JavaScript backend on txiki.js and a native launcher that shows the page in the OS webview. They talk over a private socket in a temp folder — no HTTP server, no port. The backend has files, processes and SQLite. The page has none, and reaches them through named `api` calls. `references/framework.md` maps the API, the config keys, the build and the gotchas.

## When to Use

- A repository carries `tinyjs.json` at its root.
- A task decides whether a desktop app should use tinyjs.
- A review checks a tinyjs app's data, packaging or no-network promise.
- A local-first app gains an account-backed cloud destination.

Not for a web app, a Tauri app, or a general Electron question.

## Ground first

- Read `tinyjs.json`, the product document and the docs for the installed version. `https://tinyjs.app/llms.txt` indexes every page.
- Pin `minTinyjsVersion`. A tinyjs upgrade is a reviewed change, not a `latest` tag.
- Choose the app `id` before release. It names the data folder, the OS identity and single-instance detection. Changing it starts every user empty.

## Shape

- The plain template is `src/backend/main.js` (or `.ts`), `src/frontend/` with `index.html`, JS and CSS, an icon, and `tinyjs.json`. Take a Vite template only when the page needs a framework: it grows the size and the dependency surface.
- The page is a real `file://` document and has no `tjs`. Never hand it a general `exec` or `query` call: every page the app loads can call anything in `api`. Expose named operations only.
- A page from a site you do not control makes the app a site wrapper. Only then is the `api` gate in `tinyjs.json` mandatory. Do not load one in a local-first app.

## Data

- Durable data goes in `(await app.paths()).data`. Never a relative path: `./` is the working directory, often `/` in a built app. `paths()` creates the folder.
- SQLite is built in (`tjs:sqlite`) and synchronous. `tjs.*` file calls are async, so await `makeDir` before opening a database.
- Autosave a whole document with a monotonic sequence: never delete the row. Write an empty body as a tombstone, and make the upsert conditional on the incoming sequence being greater than the stored one. A late write then cannot resurrect a cleared document. Test the stale sequence.
- WAL and `synchronous=FULL` let a committed save survive a power loss, at one flush per save. Keep the debounce in the system document, and promise nothing the debounce can lose.

## Local-only promises

- "No network" rules out the auto-update check: `update.url` and `tinyjs publish` fetch a manifest. Omit the `update` block and ship downloads. A check added later is a new decision.
- Prove it with the network off on the built app. A green build says nothing about a request.
- Dialogs are page-only (`tiny.dialog.pickFolder`, `saveFile`). Reading and writing the chosen path is the backend's.
- A local app's "real-time" means save-as-you-type on this machine, not another device. Cross-device live means a sync service: scope it later or leave it out.
- An opt-in cloud destination is a new version and a new ADR, never a flag. `references/oauth-and-cloud-destinations.md` covers one-way vs two-way, PKCE, the loopback redirect, `app.secrets` and per-item remote ids.

## Ship

- `tinyjs build` builds for the OS it runs on, so macOS, Windows and Linux need three runners. macOS first install needs a Developer ID signature and notarization; `--dmg` packages the app. Windows and Linux signing is a separate certificate decision.
- `tinyjs dev` hot-reloads the page and restarts the backend. `tinyjs doctor` diagnoses a setup that will not run.
- Test pure logic with `bun test`. Test the store against the same SQL, injecting the `Database` so the backend opens `tjs:sqlite`. The webview, native dialogs, the data folder and the signed bundle are checked by hand each release, headless, with `references/verifying-a-build.md`.
- `mock.module('tjs:sqlite', () => ({ Database }))` imports `src/backend/main.js` under `bun test`, so the `api` calls run against a real store. Walk a paging loop over a hundred days and count duplicates and gaps.
- The page is reachable too: a stub `document`, `window` and `tiny` around `src/frontend/app.js` drives its handlers, which reproduces a wrong status line without a webview.

## Pitfalls

- **A menu item is not cross-platform on a frameless or transparent window.** Windows draws no menu bar for one, so `menu.set` succeeds and nothing is visible. Give Windows a page-drawn control, or record the gap in the product document — never write "everywhere".
- **An unavailable feature must leave a trace, or it reads as unimplemented.** A menu that returns `[]` when `availability()` says `'unsupported'` removes every hint. A person on the wrong OS version then reports it as broken, not absent. Keep a disabled item that names the state ("needs macOS 26"), and feature-detect `app.macos?.ai` first: the surface can be `undefined` on a launcher built without the FoundationModels shim.
- No `node:*` modules and no package that needs them; txiki.js is not Node. A TypeScript backend bundles npm packages with esbuild only when they avoid Node's built-ins.
- `import.meta.url` throws in a built app. Find shipped files through `app.paths().resources` and `executables`.
- A hidden or covered webview throttles timers. Do continuous work in the backend and push events to the page.
- `tinyjs build` empties `dist/` first. Never keep an artifact you need there.
