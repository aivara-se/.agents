# tinyjs framework notes

As of tinyjs 0.66.2, MIT. Re-read `https://tinyjs.app/llms.txt` for the installed version; these notes are a map, not the contract.

## The shape

Two processes:

- **Backend** — plain JavaScript or TypeScript on txiki.js. Exports `init(app)`, `export const api`, and optional hooks (`onMenu`, `onSystem`, `onWindowClosed`, `onOpenFiles`, `onUpdateAvailable`). Has the `tjs` global and `tjs:*` modules, `app.paths()`, `app.win`, `app.menu` and `app.push`.
- **Launcher** — native. Owns the window, menus, tray and dialogs; runs the system webview: WKWebView on macOS, WebView2 on Windows, GTK3 + WebKitGTK 4.1 on Linux. Talks to the backend over a Unix socket, or a named pipe on Windows. No HTTP server and no port.
- **Page** — a real `file://` document. Gets `window.tiny` before its scripts; has no `tjs`. Calls `tiny.api.call`, listens with `tiny.api.on`, and uses `tiny.win`, `tiny.dialog`, `tiny.menu`, `tiny.store`, `tiny.app`.

`tinyjs dev` hot-reloads page edits in place and restarts the backend on backend edits. `TINYJS_DEBUG=1` traces every message across the bridge. Platforms: macOS 15+ (arm64 and x86_64), Windows 10/11 (x86_64 and arm64), Linux with WebKitGTK 4.1.

## tinyjs.json

Every key is optional except `name`.

| key | effect |
|---|---|
| `name` | executable and archive name |
| `title` | window title, menu name, `.app` folder |
| `id` | reverse-domain identity; keys the data folder, store, secrets, window positions and single-instance detection |
| `version` | About panel; what auto-update compares |
| `minTinyjsVersion` | oldest accepted tinyjs; older refuses to dev or build |
| `size` | main window page box, `WxH` |
| `backend` | entry file; its folder is the backend root |
| `frontend` | `dir`, or `build`/`dist`/`dev`/`devUrl` for a bundler |
| `icon` | 1024×1024 PNG |
| `resources` / `executables` | shipped files; `paths().resources` / `executables` |
| `update` | `url`, `auto`, `publicKey`; auto-update is a network call |
| `api` | gate for pages you do not ship; omitted means no limit |
| `debug`, `contextMenu`, `popups`, `downloads` | devtools, built-in right-click menu, popup and download policy |
| `rememberWindows`, `mainWindow` | window restoration; no main window at all |
| `macos`, `windows`, `linux` | per-OS overrides merged over the root |

`id` is fixed before release. Changing it starts users with an empty data folder.

## Paths and storage

`await app.paths()` returns `{ home, data, cache, logs, temp, downloads, desktop, documents, resources, executables }`. `data` is `~/Library/Application Support/<id>` on macOS, `%APPDATA%\<id>` on Windows, and `~/.local/share/<id>` (or `$XDG_DATA_HOME`) on Linux. `resources` and `executables` are `null` when absent.

`tiny.store` is `store.json` in `data`: flat keys with JSON values, for settings. For data you query, use SQLite. `tjs:sqlite` is synchronous:

```js
import { Database } from 'tjs:sqlite';
const db = new Database(path);
db.exec('PRAGMA journal_mode = WAL');
const row = db.prepare('SELECT body FROM notes WHERE day = ?').all(day)[0];
db.prepare('INSERT INTO notes (day, body, seq) VALUES (?, ?, ?) ON CONFLICT(day) DO UPDATE SET body = excluded.body, seq = excluded.seq WHERE excluded.seq > notes.seq').run(day, body, seq);
```

There is no `get()`; use `.all(...)[0]`. `run()` returns nothing; add `RETURNING` and use `.all()` when the new row is needed. `db.transaction(fn)` commits on return and rolls back on throw. `db.close()` closes.

## API surface

- `api` functions get `(params, app, { window, origin })`; they return JSON, and a thrown error reaches the page as the message string, not an `Error`.
- `app.push(name, data)` reaches every window; the page listens with `tiny.api.on(name, fn)`. `app.win.push` reaches the main window; `app.window(id).push` one window.
- Dialogs are page-only: `tiny.dialog.openFile`, `openFiles`, `pickFolder`, `saveFile`, `alert`, `confirm`, `prompt`. No backend twin. A picker returns a path; the backend does the I/O.
- Menus: `app.menu.set([...])` in `init`; clicks reach the backend's `onMenu(id, app)` and the page's `tiny.menu.on`.
- Window: `app.win.setTitle`, `app.win.open(id, opts)`, `app.win.setHideOnClose`, `rememberWindows`.
- Single instance is keyed by `id`; a second launch does not open a second writer on the same data folder.

## Build and release

- `tinyjs build` builds for the OS it runs on. macOS: `dist/<title>.app` and a bare `dist/<name>`; `--dmg` adds the disk image; `--arch arm64|x86_64` or `--universal` picks the CPUs. Windows: `dist/<name>.exe` plus the folder. Linux: `dist/<name>` plus the folder. `--cli` also writes a command that opens files through `onOpenFiles`.
- `tinyjs notarize` needs a Developer ID Application certificate and a keychain profile holding an app-specific password. It checks the built app carries a real Developer ID signature.
- `tinyjs publish` builds, zips and writes `manifest.json` for auto-update. The app's `update.url` points at the manifest; `update.auto` is `launch` or `daily`. Install verifies sha256 and, on macOS, the code signature and Team ID. Signed updates pin Ed25519 public keys and sign the manifest with a private key outside the project.
- Cross-OS builds are not supported: build each OS on its own runner. macOS can build either CPU with `--arch` or one universal app with `--universal`.

## Gotchas

- No Node: no `require`, `process`, `Buffer` or `node:*`. Use `tjs`, Web APIs, or a TypeScript backend bundled with esbuild that avoids Node's built-ins.
- `tjs` file calls are async; SQLite is sync. A missing `await tjs.makeDir(...)` before `new Database(...)` is a race that fails only sometimes.
- `tjs.cwd` is a property, and in a built app it is rarely the project folder. Build paths from `app.paths()`.
- `import.meta.url` throws in a built app; the backend is compiled into one executable.
- A hidden, covered or minimized webview throttles timers and `requestAnimationFrame`; put continuous work in the backend.
- macOS limits local media to the page's folder unless `readAccess` is set; Windows and Linux do not.
- Wayland limits window placement and global hotkeys; `windowPlacement` can run the app through XWayland.
- `tinyjs build` empties `dist/` first.
- The default right-click menu carries Reload and Inspect; `contextMenu: false` removes it, and a custom menu needs `tiny.menu.setContext` with stock edit roles.
- `tinyjs publish` does not notarize; first installs ship from `build` + `notarize`. Auto-update refuses in `dev` and from macOS App Translocation.

## Docs

- `https://tinyjs.app/docs/` — the pages by topic.
- `https://tinyjs.app/llms.txt` — the index of every page.
- `https://tinyjs.app/llms-full.txt` — every page in one file.
- Start with `how-it-works`, `backend`, `sqlite`, `config`, `cli`, `auto-update`, `signed-updates`, `gotchas`, `portability`.
