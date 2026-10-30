---
name: svelte-native-desktop
description: "Port or build a gpuix-svelte desktop app."
version: 1.0.0
author: MiMi
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [gpuix-svelte, gpui, svelte, desktop, macos, xvfb, packaging]
    category: software-development
    related_skills: [web-frontend-delivery, page-geometry-cdp, github, testing]
---

# Desktop apps with gpuix-svelte

## When to use

- Porting a webview app (tinyjs, Electron, Tauri) to gpuix-svelte, or writing a native Svelte desktop app.
- Building or shipping the macOS artifact, or checking a native window's layout with no desktop session.

## What the stack is

Svelte 5 components compiled through Svelte's custom-renderer API into GPUI nodes (Zed's GPU UI framework). No DOM and no webview: elements are GPUI's, CSS is translated property by property into a flexbox style object, and the app runs in Node ≥24 or Bun with full filesystem and database access. `svelte` itself stays out of `package.json`; the package bundles the matching build and resolves every import to it.

## Procedure

1. **Scaffold**: `bun create gpuix-svelte@latest <dir>`.
2. **Add a port beside the old app, not on top of it.** A branch with the new app in its own directory (`gpuix/`) leaves the shipping app, its tests and its release workflow untouched, and the PR shows the port in full.
3. **Port the behaviour and the measured layout.** Keep the store/day modules and their tests: port the tests unchanged onto `bun:sqlite` and let the suite prove parity. Keep the data file name and folder so the port reads the same notes. Reproduce the old window's numbers — size, columns, type scale, spacing — from its manifest and stylesheet; the operator compares the two screens, not the source. Map each interaction explicitly — debounce, in-flight save, stale-counter write, tombstones, paging window, delete confirmation, fatal path.
4. **Read `references/renderer-quirks.md` before styling.** CSS is a subset; each trap there costs an hour of visual debugging.
5. **Run it natively and look at it** (loop below). Headless screenshots are not available on Linux.
6. **Typecheck and test**: `bun run typecheck && bun test`.
7. **Build on the target OS** (see Build and ship).

## Parity with the app being replaced

A port is judged against the running app, not against the code it came from. When the ask is
"as similar as possible", match numbers, not impressions.

- Take the window size from the old app's manifest (`tinyjs.json` `size`, the Tauri config) and
  the type scale, colours and paddings from its stylesheet; reproduce those values.
- Measure the reference screenshot's geometry: content-column width, left gutter, date column,
  entry gap, top padding. A missing `flex-direction: column` on the scroll container left the
  log at the left edge while every other number matched — the container's own direction is part
  of the layout.
- Reproduce the empty state too: today's placeholder, the hidden delete control, the focused
  caret. A screenshot comparison shows those before it shows anything else.
- Compare at the same window size and cropped: screenshot the window, cut the frame, and read
  the two images side by side.
- Walk the interactions with `xdotool` and assert the database row, not the pixels: type →
  debounce → row `seq` + 1; delete → empty tombstone; Today → reload; wheel → older page.

## Verify the real window (Linux sandbox)

```bash
Xvfb :99 -screen 0 1200x800x24 -nolisten tcp &      # the background tool, not nohup
DISPLAY=:99 bun node_modules/gpuix-svelte/bin/gpuix-svelte.js --bun app.ts &
sleep 7
DISPLAY=:99 xwd -root -silent > root.xwd
convert root.xwd shot.png                            # crop to the window before reading it
```

- Drive it with `xdotool`: `mousemove <x> <y> click 1`, `type --delay 40 "text"`, `click --repeat 60 5` for the wheel.
- Assert persistence in the database with `bun -e` and `bun:sqlite`, not by eye: the row and its counter moving is the proof.
- Crop the window out of the root screenshot before `vision_analyze`; full-screen shots time out and the black frame wastes the read.
- Record the window origin from the crop, then add it to element coordinates for `xdotool`.
- Kill the app by a pid resolved in a separate call (see pitfalls).

## Build and ship

- `bun run build` produces one executable for the host. The GPUI addon is a prebuilt native module installed for the host platform only, so cross-compiling embeds the wrong `.node`: build each OS on its own runner.
- macOS arm64: GitHub Actions `macos-15`, `oven-sh/setup-bun@v2`, `bun install --frozen-lockfile`, `bun run build:app`, then `ditto -c -k --keepParent dist/<App>.app <App>-<version>-macos-arm64.zip` and upload it as an artifact. A small app builds in under a minute.
- A `.app` is the binary in `Contents/MacOS`, an `Info.plist`, and an `.icns` cut with `sips` + `iconutil`; ad-hoc sign with `codesign --force --deep --sign -` when there is no Developer ID. A downloaded ad-hoc app needs right-click → Open once.
- Size: a Bun+GPUI `.app` is ~110MB; the `ditto` zip is ~51MB (stored, barely compressed) while `tar -cJf` with xz gives ~32MB. Telegram bots cap around 50MB: send the `.tar.xz`, opened with `tar -xf <file> && open <App>.app`.
- That ~110MB is the runtime, not the app: `bun build --compile` on a hello-world is ~109MB on its own, and the GPUI addon adds ~24MB, so trimming app code cannot make the bundle small. Settle whether the product's download-size promise allows it before porting; if it does not, the port is a spike, not a candidate.

## Pitfalls

- **Unitless `line-height` means pixels.** `line-height: 1.65` draws every line 1.65px apart — a smear of overlapping text; write `31.35px` for 19px × 1.65.
- **A `<textarea>` has no auto-height.** It is sized in `minRows` and clips the rest; measure the wrapped lines with fontkit against the same TTF and pass `minRows`.
- **`hitbox="self"` on a clickable element whose children paint.** The click lands on the `<svg>`/`<text>` child, so an icon button without it does nothing and the handler is blamed instead.
- **`register_font()` before the window exists is a silent no-op** (`get_native()` is null, `win()?.registerFont?.()`), and a face arriving after an element painted cannot restyle it. Register in the root's `$effect`, flip a ready flag and mount the tree under `{#if ready}`; guard the call module-wide or a no-op first call blocks the real one.
- **A quoted `font-family` silently falls back to the default sans; write it unquoted.**
  `font-family: Newsreader` resolves a registered face, `font-family: 'Newsreader'` does not,
  and a multi-word family (an "Instrument Sans" you registered) cannot be written unquoted at
  all — rename the face to one word when you register it, or that element keeps the system
  font. Confirm on a screenshot: a wrong name reads as "font-family is ignored".
- **`render_hot` watches `.svelte` files only.** Editing `app.ts` or any `.ts` module needs a restart; the window size lives in `app.ts`.
- **The Linux prebuild has no test renderer**, so `gpuix-svelte test` only runs on macOS and Windows; on Linux verify through the real window instead.
- **A compiled binary cannot carry the `.node` addon.** Bun embeds it, extracts it to `$TMPDIR` at launch and dlopens it there, so a noexec `/tmp` dies with `failed to map segment from shared object`; `--external` is no better, because a compiled binary resolves externals from the cwd, not from beside the executable. Copy the platform addon (`@gpuix/native-*/…node`) next to the executable — into `Contents/MacOS` for a `.app` — and resolve `@gpuix/native` to a virtual module that does `createRequire(process.execPath)(join(dirname(process.execPath), '<name>.node'))`; then have CI launch the built app and wait for `mount complete`. The binary also shrinks (155 → 105 MB Linux, 86 MB macOS) because the addon is no longer embedded twice.
- **`$state(new Map())` never re-runs the template.** `$state` does not proxy a `Map`, so `.set()`/`.delete()` invalidate nothing; use `new SvelteMap()` from `svelte/reactivity` (no new dependency) and `.clear()` instead of replacing it.
- **A quit has no blur and no promise.** A GPUI window exposes no window-blur or visibilitychange event, and a quitting process never resumes a pending promise, so a 300 ms debounce loses its last keystrokes. Flush unsaved input from `process.on('exit')` through a synchronous write (open the store eagerly, keep the `Notes` handle) — measured: quit 36 ms after typing keeps the row. Take that write's counter from the store (`opened.day(day)?.seq + 1`), never from the page: the page advances its copy only after `await saveDay` resumes, so a quit while a save is in flight sends a counter the store already committed and the store refuses it. A kill signal runs no exit handler and still loses it.
- **Kill by literal pid, in its own call.** `ps -eo pid,args | grep "<script>" | xargs kill` matches the shell running it — its argv contains the pattern — and the tool call dies with exit 143.
- **`fontkit` has no default ESM export**: `import { create } from 'fontkit'`.
- **No `@media`, `z-index`, `letter-spacing`, `transform`, `display: none`, `caret-color` or `text-transform`.** Responsive layout is a `window_size` comparison in Svelte; overlays go last in document order or inside `<Portal>`.

## References

- `references/renderer-quirks.md` — the CSS/element/event subset, textarea sizing, fonts, scrolling, dialogs and testing.
- `templates/build-macos-app.ts` — the Bun build plus `.app` wrapper and ad-hoc signing, to copy beside an app and rename.
