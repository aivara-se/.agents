---
name: pereda-page-check
description: Exercise a Pereda PR's page and backend for real.
when-to-use: A Pereda (`aivara-se/pereda`) pull request claims page behaviour (a mode, a page, a key, a scroll or caret return) or a backend call, and the claim needs to be exercised, not read.
---

# Checking Pereda's page and backend

Gate first: `bun fmt --no-script --check .`, `bun test`, `bun run build`, and `bun run build:web` since the site joined the repository. Then exercise the claim.

`bun test` needs `bun install --frozen-lockfile` in a fresh worktree, or the workspace imports fail and the run reads 61 pass, 3 fail. Never read that as the head's result.

`bun fmt` infers no parser for `.svelte`: the tree check skips those files in silence and exits 0, while naming one exits 2 with "No parser could be inferred". Append junk to a `.svelte` file to confirm before you trust a formatting claim about one.

## The frontend, in a real Chromium

`bun run build` bundles the page into `apps/desktop/.page/`; serve that directory (`python3 -m http.server 8901`) and the page needs no other file. It sidesteps the `libs/` and `src/shared` import roots that move between releases.

- No browser ships in the sandbox, but the network is up: `npm i playwright-core`, then `npx playwright-core install chromium`. The extractor can hang at 8 MB — unzip `/root/tmp/playwright-download-chromium-*.zip` into `$PLAYWRIGHT_BROWSERS_PATH/chromium-<rev>/chrome-linux/` and `chmod -R a+x` it. Launch with `executablePath` and `--no-sandbox`.
- `browser_exec` refuses `127.0.0.1` (private address) and its browser is not this sandbox.
- Stub `tiny` with `page.addInitScript` before `goto`: `system.os`, `hotkey.on`, `win.*`, `api.call` (fake `openLog` returns `{ today, days: [{ day, body, seq }], more }`, plus `saveDay`, `searchNotes`, `summariseNote`), `api.on`, `dialog.confirm`/`pickFolder`.
- Press with `page.mouse.down()` / `up()`, not `click()`. Most claims are about a press whose mousedown blurs the note. To model a webview that does not focus the pressed button, blur the note in a capture-phase `mousedown` listener that calls `preventDefault()`.
- Chrome blocks `file://` ES modules — use the http server.
- Keys: `document.dispatchEvent(new KeyboardEvent('keydown', {...}))`. The handler is on `document`; `keyAction` reads `metaKey`/`ctrlKey`.

## The web app, in the same Chromium

- `bun run build:web` writes `apps/website/build`; serve it over http on `127.0.0.1`.
- Seed a day before the app loads. Only one access handle may hold the OPFS file: a worker started beside the running page fails with "Access Handles cannot be created if there is another open Access Handle". Open a same-origin document that boots no app script (`/robots.txt`), run `new Worker('/_app/immutable/workers/worker-<hash>.js', { type: 'module' })`, post `{ id, name: 'saveDay', args: [{ day, body, seq: 1 }] }`, terminate it, then `page.goto('/')`. The reply carries `{ day, seq, today }`.
- A row hung below a `position: relative` column is clipped when that column carries `overflow: hidden`; the clip removes it from the hit test. Read `document.elementsFromPoint` at the button's own rect, never its computed `visibility`: a row at `visibility: visible` was fully clipped and no press landed.

## Prove the rule

A CSS finding is one A/B: measure at the head, then `page.addStyleTag` the rule the diff removed and measure again. Name the property, the element and the frame count in the finding.

## What a screenshot cannot show

- No caret is painted into a Chromium screenshot on this box, headful under `xvfb-run` or headless: a focused `contenteditable` with `caret-color: #a9541c` reads 0 accent pixels. Read `getComputedStyle(node).caretColor` instead, and never accept a pixel count as proof that a caret is hidden.
- `.cm-cursorLayer` exists only when CodeMirror's `drawSelection()` is installed. Pereda's note does not install it, so a rule naming that class is dead CSS.

## The backend, under the real runtime

`/root/.tinyjs/bin/tjs run <script>` is txiki 26.6.0, the version the app bundles.

- Import by path relative to the script (`./src/backend/main.js`); `file:///...` specifiers fail to load.
- `import { api } from './src/backend/main.js'` with a fake `app`: `{ paths: async () => ({ data }) }`. Open the store with `openStore(path, (p) => new Database(p))`, save rows with `seq: 1`.
- `tjs.readDir` returns a `DirHandle`, not an array: `for await (const e of await tjs.readDir(dir))`.
- `tjs.writeFile` replaces an existing file and encodes UTF-8 — what the export's "verbatim, replaced" claim rests on.

## What cannot be checked here

The built app exits at once under `xvfb-run` at every head, so it is not a regression signal: the window, the native picker and the export stay the author's hand check. Say so in the review rather than implying it ran.
