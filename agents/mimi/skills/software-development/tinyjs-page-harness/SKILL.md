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

## When to Use

- A pull request changes a tinyjs app's page and you cannot run the built app (no WebKit, no display).
- A claim is about focus, keys, selection or DOM state that `bun test` never reaches.
- You need to prove a change does what its body says, and to show the same checks failing on the parent.


`bun test` in these repos covers the backend and the shared modules, never the page. To review a page change, run the real `src/frontend/app.js` in the bundled Chromium with a stand-in for the `tiny` global.

## Build it

1. Copy the app's frontend into a scratch directory: `cp -r src/frontend /tmp/h`, and copy `src/shared` to `/tmp/h/shared` so the relative imports (`../shared/x.js` → `/shared/x.js`) resolve at the server root.
2. Write `/tmp/h/stub.js` and load it as a classic script in `index.html` **before** the module script. It defines `window.tiny`: `system.os()` (read from a `?os=` query so one page serves every platform), `api.call` (return `openLog` pages, `saveDay`, `searchNotes`, `readShortcut`), `api.on`, `hotkey.on`, `win`, `dialog`. Record every call in `window.calls` — the flush and the reload are only visible there.
3. Serve with `python3 -m http.server 8899 --bind 127.0.0.1` as a background job, then drive with a node script over CDP (`--headless=new`, `--remote-debugging-port`, `Target.createTarget` + `Target.attachToTarget` with `flatten: true`, `Runtime.evaluate`, `Input.dispatchKeyEvent`).

## Drive it

- Real key events through `Input.dispatchKeyEvent` with the right `modifiers` bits (alt 1, ctrl 2, meta 4, shift 8): synthetic `KeyboardEvent`s bypass the browser defaults, so they cannot tell you whether the page cancelled them.
- To read `defaultPrevented`, add a `window` listener (bubble phase runs after `document`) that records `e.defaultPrevented`, then ask for it after the dispatch.
- Run every case twice: `?os=linux` (Ctrl) and `?os=macos` (⌘). Also press with the wrong modifier and with a third one; the negative cases are what catch a mapping bug.
- Prove the probes discriminate: run the same suite against the base's `app.js` (`git show <base>:src/frontend/app.js`) and expect the new behaviour's checks to fail.

## Pitfalls

- Setting `input.value = 'x'` in `Runtime.evaluate` fires no `input` event. Dispatch `new Event('input', { bubbles: true })` or the debounced search and the pending save never start.
- Focusing a note near the bottom fires the scroll handler, which runs `loadOlder()`: a day-key walk on a long log loads each page by itself. Measure it before reporting a dead key at the page boundary.
- Clearing `window.calls` after focusing another field wipes the blur-flush evidence. Filter, focus last, or read the count before.
- A forced push after you probed rewrites the head. Re-read `headRefOid` before posting, and hash the files you ran against the new head so "at this head" stays true.
- On a stacked pull request the base branch moves too, and the base's own `app.js` carries changes from the PRs below it: `git diff <old head> <new head> -- src/frontend/app.js` shows what slid under your probe. The `test/` count moves with it, so a body that quotes `bun test` counts goes stale on every rebase.
- A head that is behind the default branch is only a merge hazard if its base is that branch. Check `git rev-list --count <head>..origin/main` and what those commits touch before refusing; a stacked PR two docs commits behind main loses nothing.
