---
name: tinyjs
description: Use when building or changing a tinyjs desktop app.
when-to-use: Any change to a tinyjs app — its backend, page, tinyjs.json, build, bundled assets or a hand check.
---

# tinyjs desktop app

## Before the first line

- Read the framework pages for the version installed: `first-app`, `config`, `backend`, `api`, `sqlite`, `window`, `dialogs`, `gotchas` at https://tinyjs.app/docs/<page>. They describe the CLI you have, not an older one.
- Scaffold a throwaway app with `tinyjs new /root/scratch/tmpl` and read it: `src/backend/main.js`, `src/frontend/`, `assets/icon.png`, `tinyjs.json`, `jsconfig.json`, `types/`. It is the plain template; copy its shape rather than inventing a bundler or a second config.
- `tinyjs version` must satisfy `minTinyjsVersion`. `tinyjs doctor` names a missing runtime; on Linux install `libwebkit2gtk-4.1-0` and `libayatana-appindicator3-1`.

## Shape

- Backend `src/backend/main.js` runs on txiki.js: export `api` (named calls), optional `init(app)` and hooks. It has `tjs:*` modules and Web APIs, no `node:*` and no npm runtime.
- Page `src/frontend/`: plain `index.html`, CSS and JavaScript. Both sides import pure modules from `src/shared/`; nothing there may touch `tjs`.
- `tinyjs.json` fixes `id`, which names the data folder and cannot change after release. `name` is the executable, `title` the window.
- The backend owns the clock, the filesystem and the database. The page never calls `app.paths()`; it asks through `api`.

## The store

- Open `new Database((await app.paths()).data + '/<name>.db')`; never a relative path. Open once and share the promise, so every call reports the same failure.
- `tjs:sqlite` is synchronous: `exec`, `prepare(...).all/run`, `transaction`. Set `journal_mode = WAL` and `synchronous = FULL` for a committed save; keep the schema version in `PRAGMA user_version`.
- Keep the SQL in a module that takes the open handle, so `bun test` can pass `bun:sqlite` and run the same statements. `tjs:*` cannot be imported under bun.
- Named operations only; never `query(sql)`. The page can call every exported name.
- Search is FTS5 in the same file, not a second store: a `notes_fts` table filled by triggers, derived from `notes` and joined back to it, with every user word quoted as a prefix term so it is never FTS5 syntax. `references/sqlite-store.md` has the schema, the v1→v2 migration and the escaping.

## A live editor

- One save in flight (per entry when the page is a log); a newer body replaces the pending one; the whole body goes every time with a page counter. The store applies `excluded.seq > notes.seq`; a tombstone (empty body) keeps its counter, so a late save cannot undo a clear.
- A log is many editors: each entry keeps its own counter and runner, flushes on its own blur, and the page is the one scroll container. Auto-size each textarea to `scrollHeight`; a textarea with `flex: 1` in a flex row ignores `max-width` and `margin: auto` and fills the row — put it in a block container instead.
- Measure a textarea only while its container is laid out: an entry built into a `hidden` log reports `scrollHeight` 0 and keeps a one-line box, and the caret then shows only its last line. Unhide the list before rendering into it, not after.
- Page a log by `day < the oldest loaded`, never by offset: today first, then thirty at a time. Include today's row even when it is empty or a tombstone, and start its counter from that row's seq; a placeholder at seq 0 loses the comparison and every save reports a stale write.
- Keep save failures and page failures in separate slots, and let the save failure win the status line; a page error that returns first otherwise hides "not saved" while the text sits on screen.
- Compare the body as well as the counter before reporting success: two windows at the same counter otherwise both say "Saved" while one write lost.
- Release the runner after assigning it: `runner = run().then(ok => { runner = null; return ok; }, err => { runner = null; throw err; })`. A `finally` inside `run` clears `runner` before the assignment when the loop is empty, and every later flush reuses a dead promise.
- Flush on a short debounce, on blur, when the window hides and before a day switch. A failed flush blocks the switch, so text never lands on another date, and the error stays until a save succeeds.

## The window

- Chrome that is not the system's belongs in `chrome` in `tinyjs.json` — `frame: false`, `windowControls: false`, `transparent`, a vibrancy material — so the first paint is already frameless; `setChrome()` afterwards flashes the default title bar. `references/window-chrome.md` has the page shape, the controls, and the headless proof of the alpha.
- The page takes over the two promises the frame kept: the window stays closable and a close loses nothing. An in-page close flushes the pending saves before `tiny.win.close()`, and an error state that hides the app is inset below the bar rather than over it.
- A drag region is `data-tiny-drag` on the bar; everything interactive inside it keeps working, so controls and the drag area share one element without `data-tiny-nodrag`.
- A menu bar is not drawn on Windows when the window is frameless or transparent; accelerators still fire, but a menu-only command is unreachable there.

## A global hotkey

- Register it in `init(app)` with `app.hotkey.register(id, combo)`, not in the page: on macOS the window closes and the process keeps running, and the press must still work. The id and combo belong in `src/shared/` because the page hears the same id.
- Keep the registration promise and answer a page's api call with it: `false` means the system has no global hotkeys or gave the combo to someone else, and that is a notice once, not an error.
- `onHotkey(id, app)` in the backend shows the window (`app.win.show()`); the page's `tiny.hotkey.on` runs the app's own path, so the shortcut has one behaviour. `references/hotkeys.md` has the wiring and how to prove both outcomes with no desktop.

## Fonts and assets

- Bundle webfonts in `src/frontend/fonts/` with their licence and `@font-face`; `tinyjs build` embeds the whole frontend (`strings dist/<app> | grep <font>` proves it). No CDN: the app must work offline.
- `import.meta.url` throws in a built app; find shipped files through `app.paths()`.

## Build and check

- `bun test` for the shared and store modules; `tinyjs build` for this OS. The build is a self-contained binary plus `launcher` and `icon.png`.
- A `main.js` handler is invisible to a menu-only test: stub every `tjs:*` module `main.js` imports — a new top-level import breaks every test that loads it — then call `api.<name>` with a fake `app` (`references/backend-handlers.md`).
- Declare module-level flags at the top of the module. A flag assigned but never declared is a `ReferenceError` under a module, and only a handler test sees it.
- Shipping is a release pull request, not a push: the Baseline ruleset refuses a push to `main` and the workflow token cannot approve. The version in `tinyjs.json` is the trigger and is raised in the change that earns it; `references/release.md` has the gate, the artifacts, the post-merge check of the run and the signing secrets.
- Run the built app under Xvfb and drive it with xdotool; capture with `import -window <id>`; read the SQLite file after typing. `references/headless-run.md` has the recipe.
- For page behaviour — modes, focus, layout, opacity — serve `src/frontend` and fake only the `tiny` bridge in Chromium, then assert computed style and geometry (`references/page-harness.md`). It is faster than driving the built app and still uses the real page.
- Check the window at the size it ships and read the pixels back; no screenshot means no proof.

## Pitfalls

- Kill the app's real children (`dist/<app>`, `dist/launcher`, `tjs run …`, `native/launcher-linux`); killing the terminal session leaves them. A second launch only raises the first window, so a "new" build can screenshot the old app.
- Capture by window id: without a window manager the window moves between launches, and a root crop by remembered coordinates adds a black strip. A transparent window inverts this — `import -window` flattens it over black, so that one is captured from the root, cropped by the geometry read in the same run.
- Editing while `tinyjs dev` restarts the backend can fail `EEXIST: file already exists`; stop dev, remove `.build`, relaunch.
- A native folder dialog is the one part Xvfb cannot drive; verify the backend call directly and hand-check the dialog on a desktop.
- Never name an `api` function after a tinyjs built-in (`log`, `ping`, `notify`, `fetch`, `quit`): the built-in wins, so the call resolves with its empty result and the page sees `null` rather than an unknown-name error. Name the operation (`openLog`), not the noun.
- Build the blank template beside the app before blaming the app for its size; the framework runtime dominates.
- A control drawn only while an editable has focus is styled with `:focus-within`, never hidden by a blur handler: clicking the control takes focus from the editable first, and a hidden button never receives the click.
- Take a debounced request's token before the await that precedes it; taken after a flush, a query the field already replaced still lands and repaints old results.
- A caret-driven effect also tests `document.hasFocus()`: a textarea keeps `activeElement` while the window is behind another app, so the effect would stay on.

## References

- `references/headless-run.md` — Xvfb, xdotool, window capture, process cleanup, SQLite check.
- `references/window-chrome.md` — frameless and translucent windows: config, page shape, in-page controls, proving the alpha.
- `references/sqlite-store.md` — schema, WAL, counter upserts, tombstone, FTS5 search with quoted prefix terms and triggers, the version migration, tests under bun.
- `references/backend-handlers.md` — load `main.js` under bun, stub `tjs:sqlite`, fake the `app` handle, and test the handler's branches.
- `references/page-harness.md` — serve `src/frontend` with a stubbed `tiny` bridge; assert mode, geometry and paint in Chromium.
- `references/bundled-fonts.md` — fetch an OFL font, ship it, prove it is embedded.
- `references/hotkeys.md` — register one hotkey, and prove the press and the refusal under Xvfb.
- `references/release.md` — the version-in-the-file gate, artifact shapes per OS, the test `.app` a pull request leaves, checking the run and the artifacts after the merge, the token and signing caveats.
