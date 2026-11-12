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

- Playwright is the fallback when `browser_exec` is missing: `npm i playwright-core`, then `npx playwright-core install chromium`. Its extractor can hang at 8 MB — unzip the partial download into `$PLAYWRIGHT_BROWSERS_PATH/chromium-<rev>/chrome-linux/` and `chmod -R a+x` it. Launch with `executablePath` and `--no-sandbox`.
- `browser_exec` reaches `127.0.0.1` on its own browser, so the page needs no Playwright install: `new_tab`, `js`, `cdp`. Its `click_at_xy` and `cdp('Input.dispatchMouseEvent', ...)` deliver no event; dispatch in the page instead — `b.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))` then `b.click()`, which still reaches the mousedown handler. A `fill_input` that reports nothing leaves the field empty: focus it, then `cdp('Input.insertText', text=...)`.
- Stub `tiny` with `page.addInitScript` before `goto`: `system.os` (a function; a string throws at load, the page renders nothing and says nothing — record `window.onerror` to see it), `hotkey.on`, `win.*`, `api.call` (fake `openLog` returns `{ today, days: [{ day, body, seq }], more }`, plus `saveDay`, `searchNotes`, `summariseNote`), `api.on`, `dialog.confirm`/`pickFolder`. No `today`, or days with no `seq`, draws a log where no entry is today's.
- Press with `page.mouse.down()` / `up()`, not `click()`. Most claims are about a press whose mousedown blurs the note. To model a webview that does not focus the pressed button, blur the note in a capture-phase `mousedown` listener that calls `preventDefault()`.
- Chrome blocks `file://` ES modules — use the http server.
- Keys: `document.dispatchEvent(new KeyboardEvent('keydown', {...}))`. The handler is on `document`; `keyAction` reads `metaKey`/`ctrlKey`.

## The web app, in the same Chromium

- `bun run build:web` writes `apps/website/build`; serve it over http on `127.0.0.1`.
- Seed a day: only one handle may hold the OPFS file, so boot a same-origin page that runs no app script (`/robots.txt`), start `new Worker('/_app/immutable/workers/worker-<hash>.js', { type: 'module' })`, post `{ id, name: 'saveDay', args: [{ day, body, seq: 1 }] }`, terminate it, then open `/`. A worker started beside the running page fails: "Access Handles cannot be created if there is another open Access Handle".
- A row hung below a `position: relative` column is clipped when that column carries `overflow: hidden`; the clip removes it from the hit test. Read `document.elementsFromPoint` at the button's own rect, never its computed `visibility`: a row at `visibility: visible` was fully clipped and no press landed.

## Prove the rule

A CSS finding is one A/B: measure at the head, `page.addStyleTag` the rule the diff removed, then measure again. Name the property, the element and the frame count.

A caret is never painted into a Chromium screenshot on this box, headful or headless: read `getComputedStyle(node).caretColor`, never a pixel count. `.cm-cursorLayer` exists only when CodeMirror's `drawSelection()` is installed, which Pereda's note does not, so a rule naming that class is dead CSS.

## The backend, under the real runtime

`/root/.tinyjs/bin/tjs run <script>` is txiki 26.6.0, the version the app bundles.

- Import by path relative to the script (`./src/backend/main.js`); `file:///...` specifiers fail to load.
- `import { api } from './src/backend/main.js'` with a fake `app`: `{ paths: async () => ({ data }) }`. Open the store with `openStore(path, (p) => new Database(p))`, save rows with `seq: 1`.
- `tjs.readDir` returns a `DirHandle`, not an array: `for await (const e of await tjs.readDir(dir))`.
- `tjs.writeFile` replaces an existing file and encodes UTF-8 — what the export's "verbatim, replaced" claim rests on.

## The documents, against their sources

Half of Pereda's diffs are documents. Test each quoted span of a new ADR against `docs/adrs/`:

```python
import re, pathlib
adrs = pathlib.Path("docs/adrs")
new = max(adrs.glob("0*.md")).read_text()
for q in re.findall(r'"([^"]+)"', new):
    print(q[:60], [p.stem[:3] for p in adrs.glob("0*.md") if q in p.read_text()])
```

A span found only in its own file is a paraphrase, and `writing` says quote an ADR's condition word for word.

Then `git grep -n '<the rule the change removed>'`: the product document, the system document, an ADR's Consequences and a source comment each hold a copy, so fix every copy.

## What cannot be checked here

The built app exits at once under `xvfb-run` at every head, so it is not a regression signal: the window, the native picker and the export stay the author's hand check. Say so in the review rather than implying it ran.
