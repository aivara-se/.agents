---
name: tinyjs-page-harness
description: "Use when reviewing a tinyjs page change."
when-to-use: A pull request changes a tinyjs app's page and there is no WebKit in the sandbox, or `bun test` cannot reach the behaviour being claimed. The harness runs the real page in headless Chromium with the runtime stubbed.
version: 1.0.0
author: mimi
license: MIT
metadata:
  hermes:
    tags: [tinyjs, review, frontend, chromium, cdp]
    related_skills: [review, page-geometry-cdp, web-frontend-delivery]
---

# The tinyjs page harness

`bun test` covers the backend and shared modules, never the page. Run the real `src/frontend/app.js` in the bundled Chromium with a stand-in for the `tiny` global.

## Build it

1. Copy the frontend to a scratch directory: `cp -r src/frontend /tmp/h`, and `src/shared` to `/tmp/h/shared`, so relative imports (`../shared/x.js` → `/shared/x.js`) resolve at the server root.
2. Write `/tmp/h/stub.js` and load it as a classic script in `index.html` **before** the module script. It defines `window.tiny`: `system.os()` (from a `?os=` query, so one page serves every platform), `api.call` (returning `openLog` pages, `saveDay`, `searchNotes`, `readShortcut`), `api.on`, `hotkey.on`, `win`, `dialog`. Record every call in `window.calls` — the flush and the reload are only visible there.
3. Serve with `python3 -m http.server 8899 --bind 127.0.0.1` as a background job, then drive with a node script over CDP (`--headless=new`, `--remote-debugging-port`, `Target.createTarget` + `Target.attachToTarget` with `flatten: true`, `Runtime.evaluate`, `Input.dispatchKeyEvent`).

## Drive it

- Real key events through `Input.dispatchKeyEvent` with the right `modifiers` bits (alt 1, ctrl 2, meta 4, shift 8): synthetic `KeyboardEvent`s bypass browser defaults, so they cannot tell you whether the page cancelled them.
- To read `defaultPrevented`, record it in a `window` listener (bubble phase runs after `document`), then ask after the dispatch.
- Run every case twice: `?os=linux` (Ctrl) and `?os=macos` (⌘). Also press with the wrong modifier and a third one; the negative cases catch a mapping bug.
- Prove the probes discriminate: run the same suite against the base's `app.js` (`git show <base>:src/frontend/app.js`) and expect the new behaviour's checks to fail.

## Pitfalls

- Setting `input.value = 'x'` in `Runtime.evaluate` fires no `input` event. Dispatch `new Event('input', { bubbles: true })`, or the debounced search and the pending save never start.
- The scratch copy has no `fonts/` or `favicon.ico`, so the server answers 404 for them and `Log.entryAdded` records three errors the built app never has. Copy both, or read the 404s' paths before calling a page error a bug — the same 404s appear on the base, which proves them the harness's.
- Focusing a note near the bottom fires the scroll handler, which runs `loadOlder()`: a day-key walk on a long log loads each page by itself. Measure it before reporting a dead key at the page boundary.
- Clearing `window.calls` after focusing another field wipes the blur-flush evidence. Filter, focus last, or read the count before.
- A forced push after you probed rewrites the head. Re-read `headRefOid` before posting, and hash the files you ran against it so "at this head" stays true.
- On a stacked pull request the base moves too, and the base's `app.js` carries changes from the PRs below it: `git diff <old head> <new head> -- src/frontend/app.js` shows what slid under your probe. The `test/` count moves with it, so a body quoting `bun test` counts goes stale on every rebase.
- A head behind the default branch is only a merge hazard if its base is that branch. Check `git rev-list --count <head>..origin/main` and what those commits touch.
