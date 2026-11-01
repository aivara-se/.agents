---
name: tinyjs
description: Use when building or changing a tinyjs desktop app.
when-to-use: Any change to a tinyjs app — backend, page, tinyjs.json, build, bundled assets or a hand check.
---

# tinyjs desktop app

## Before the first line

- Read the docs for the installed version: `first-app`, `config`, `backend`, `api`, `sqlite`, `window`, `dialogs`, `gotchas` at https://tinyjs.app/docs/<page>.
- Copy the scaffold: `tinyjs new /root/scratch/tmpl` gives `src/backend/main.js`, `src/frontend/`, `assets/icon.png`, `tinyjs.json`, `jsconfig.json`, `types/`. Add no bundler.
- `tinyjs version` must satisfy `minTinyjsVersion`. On Linux `tinyjs doctor` names what is missing: `libwebkit2gtk-4.1-0`, `libayatana-appindicator3-1`.

## Shape

- Backend `src/backend/main.js` runs on txiki.js: export `api` (named calls), optional `init(app)` and hooks. `tjs:*` and Web APIs only — no `node:*`, no npm at runtime.
- Page `src/frontend/`: plain `index.html`, CSS, JavaScript. Both sides import pure modules from `src/shared/`; nothing there may touch `tjs`.
- `tinyjs.json` fixes `id`, the data-folder name, which cannot change after release. `name` is the executable, `title` the window.
- The backend owns the clock, filesystem and database. The page asks through `api`, never `app.paths()`.

## The store

- Open `new Database((await app.paths()).data + '/<name>.db')`, never a relative path. Open once and share the promise, so every call reports the same failure.
- `tjs:sqlite` is synchronous: `exec`, `prepare(...).all/run`, `transaction`. Set `journal_mode = WAL`, `synchronous = FULL`, schema version in `PRAGMA user_version`.
- Keep the SQL in a module that takes the open handle, so `bun test` runs it on `bun:sqlite`. `tjs:*` cannot load under bun.
- Named operations only, never `query(sql)`: the page can call every exported name.
- Search is FTS5 in the same file: `notes_fts`, filled by triggers from `notes`, each user word quoted as a prefix term. Schema, migration and escaping: `references/sqlite-store.md`.

## A live editor

- One save in flight (per entry in a log): a newer body replaces the pending one, and the whole body goes every time with a page counter. The store applies `excluded.seq > notes.seq`; a tombstone keeps its counter, so no late save can undo a clear.
- A log is many editors: each entry keeps its own counter and runner and flushes on its own blur; the page holds the one scroll container. Auto-size each textarea to `scrollHeight`. A `flex: 1` textarea in a flex row ignores `max-width` and `margin: auto` — use a block container.
- Measure a textarea only while its container is laid out: one built into a `hidden` log reports `scrollHeight` 0 and its caret shows only the last line.
- Page by `day < the oldest loaded`, never by offset: today first, then thirty at a time. Start today's counter from its row's seq — empty or tombstone — or seq 0 makes every save report a stale write.
- Keep save and page failures in separate slots; the save failure wins the status line, or a page error hides "not saved".
- Compare the body as well as the counter before reporting success: two windows at the same counter both say "Saved" while one write lost.
- Release the runner after assigning it: `runner = run().then(ok => { runner = null; return ok; }, err => { runner = null; throw err; })`. A `finally` inside `run` clears it before the assignment, and every later flush reuses a dead promise.
- Flush on a short debounce, on blur, when the window hides and before a day switch. A failed flush blocks the switch, so text never lands on another date.
- A note that is read-only until edited keeps its textarea and sets `readOnly`; `disabled` drops it from focus, selection and the action row. Edit clears `readOnly`, focuses and puts the caret at the end; blur sets it again.
- A read-only CodeMirror note still draws the webview's insertion caret while it has focus. `caret-color: transparent` on `.cm-content` is the switch, and the editing class turns it back on. Without `drawSelection()` CodeMirror builds no `.cm-cursorLayer`, so a rule aimed at that class does nothing.
- An overlay that replaces the log blurs the editor before its trigger's click handler runs. Read on the trigger's `mousedown` whether the note was being written, and restore it on close. Otherwise the note comes back read-only.
- Key a window-wide fade on `:focus-within` and the body class that says a writable note has the caret. Never key it on a persistent `today` or `editing` class: today carries that class while another entry is written, so it would stay bright.

## A page that renders its own text

- `frontend.build` runs in the app folder and refuses while that folder has no `node_modules`. Add `bun install` to every job that runs `tinyjs build`.
- Keep `frontend.dist` out of `dist/`: that folder holds the packaged app, and the release archives it.
- esbuild's `serve({ servedir })` keeps `tinyjs dev` working: the bundle is served from memory at `devUrl`, and no built file lands in the source tree.
- Style the text of a whole line with a mark over that text. A line decoration is dropped when it starts where a block replace ends.
- An app-wide keydown that must beat the editor listens in the capture phase. CodeMirror ignores a key another handler already cancelled.
- A caret at either end of a form is outside it. Every note at rest has selection 0, so a rule that counts touching as inside reveals the form at a note's first character.

## The window

- Non-system chrome belongs in `chrome` in `tinyjs.json` — `frame: false`, `windowControls: false`, `transparent`, a vibrancy material — so the first paint is frameless; `setChrome()` afterwards flashes the title bar (`references/window-chrome.md`).
- The page takes over the frame's two promises: the window stays closable and a close loses nothing. An in-page close flushes pending saves before `tiny.win.close()`; an error state is inset below the bar.
- `data-tiny-drag` on the bar makes a drag region; interactive children still work, so controls need no `data-tiny-nodrag`.
- Windows draws no menu bar on a frameless or transparent window, so a menu-only command is unreachable there; accelerators still fire.
- Removing a menu group leaves the launch call behind: `app.menu.set` sat inside the group's builder, so rebuild the menu from the groups that remain. Delete the builder with the group and the surviving File menu is never set.

## A global hotkey

- Register in `init(app)` with `app.hotkey.register(id, combo)`, not the page: on macOS the window closes and the process runs on. Put the id and combo in `src/shared/`.
- Keep that promise and answer the page's api call with it. `false` means no global hotkeys, or another app holds the combo: a notice once, not an error.
- `onHotkey(id, app)` shows the window; the page's `tiny.hotkey.on` runs the app's own path, so the shortcut has one behaviour. `references/hotkeys.md`.

## Fonts and assets

- Bundle webfonts in `src/frontend/fonts/` with their licence and `@font-face` (`references/bundled-fonts.md`). `tinyjs build` embeds the frontend: `strings dist/<app> | grep <font>`. No CDN; the app must work offline.
- `import.meta.url` throws in a built app; find shipped files through `app.paths()`.

## Build and check

- `bun test` for the shared and store modules; `tinyjs build` for this OS. The build is a binary plus `launcher` and `icon.png`.
- A menu-only test never runs a handler. Before importing `main.js`, stub every `tjs:*` module it imports — a new top-level import breaks every test that loads it (`references/backend-handlers.md`).
- Declare module-level flags at the top of the module: an assigned but undeclared flag is a `ReferenceError`, and only a handler test sees it.
- Shipping is a release pull request, not a push: raise the version in `tinyjs.json` in the change that earns it (`references/release.md`).
- Run the built app under Xvfb, drive it with xdotool, capture with `import -window <id>`, then read the SQLite file (`references/headless-run.md`).
- For page behaviour — modes, focus, layout, opacity — serve the app's `src` root. The entry is `/frontend/index.html`, so `../shared/` imports resolve. Fake only the `tiny` bridge in Chromium, then assert computed style and geometry (`references/page-harness.md`). When the page imports workspace packages, serve the built `.page/` beside a stub script above the module instead; every page build rewrites `index.html`, so re-add the tag after each build. It is faster than driving the built app and still uses the real page.
- In a workspace, `tinyjs` resolves the app from the directory it runs in. Keep `tinyjs.json`, `src/`, `assets/`, `test/`, `types/` and `jsconfig.json` together in the package, and run `tinyjs build` there. Root scripts `cd` into it, and `bun test` at the root finds the nested tests.
- Check the window at its shipping size and read the pixels back; no screenshot, no proof.

## Pitfalls

- A plain-JavaScript backend ships only the folder its entry sits in: an import of a package, or of any path outside it, fails at run time with `could not load '../libs/x.js'` or `could not load '@scope/pkg'` while the build stays green. Name the entry `.ts` — tinyjs bundles it with esbuild, and a package import works.
- Kill the app's real children (`dist/<app>`, `dist/launcher`, `tjs run …`, `native/launcher-linux`); the terminal leaves them, and a second launch only raises the old window.
- Capture by window id: without a window manager the window moves between launches. A transparent window is the exception — capture the root, cropped by geometry read in the same run, since `import -window` flattens it over black.
- `EEXIST: file already exists` after a `tinyjs dev` restart: stop dev, remove `.build`, relaunch.
- Xvfb cannot drive a native folder dialog; verify the backend call and hand-check on a desktop.
- Never name an `api` function after a built-in (`log`, `ping`, `notify`, `fetch`, `quit`): the built-in wins and the page gets `null`, not an unknown-name error. Name the operation (`openLog`).
- Build the blank template beside the app before blaming the app for its size; the runtime dominates.
- A control row drawn while an editable has focus must survive the press that uses it. Style it `:focus-within` (and `:hover` only where the pointer should reveal it), never `hidden` from a blur handler, and never `pointer-events: none` at the first frame of its fade: the press blurs the editable, and a webview that does not focus the pressed button loses the mouseup with the row. Let a delayed `visibility` carry both the fade and the hit test.
- Take a debounced request's token before the await, or a replaced query still lands and repaints old results.
- A caret effect also tests `document.hasFocus()`: a textarea keeps `activeElement` in a background window.
