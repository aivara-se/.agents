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

Svelte 5 components compiled through Svelte's custom-renderer API into GPUI nodes (Zed's GPU UI framework). No DOM, no webview: CSS is translated property by property into a flexbox style object, and the app runs in Node ≥24 or Bun with full filesystem and database access. `svelte` stays out of `package.json`; the package bundles the matching build.

## Procedure

1. **Scaffold**: `bun create gpuix-svelte@latest <dir>`.
2. **Put the port beside the old app, not on top of it** — its own directory (`gpuix/`) on a branch, so the shipping app, its tests and its release workflow stay untouched.
3. **Port behaviour and measured layout.** Keep the store/day modules and their tests: port the tests unchanged onto `bun:sqlite` and let the suite prove parity. Keep the data file name and folder. Reproduce the old window's numbers from its manifest and stylesheet; the operator compares the two screens. Map each interaction explicitly: debounce, in-flight save, stale-counter write, tombstones, paging window, delete confirmation, fatal path.
4. **Read `references/renderer-quirks.md` before styling.** CSS is a subset; each trap there costs an hour of visual debugging.
5. **Run it natively and look at it.** Headless screenshots are not available on Linux.
6. **Typecheck and test**: `bun run typecheck && bun test`.
7. **Build on the target OS.**

## Parity with the app being replaced

A port is judged against the running app, not the code it came from. Match numbers, not impressions.

- Window size from the old manifest (`tinyjs.json` `size`, the Tauri config); type scale, colours and paddings from its stylesheet.
- Measure the reference screenshot: content-column width, left gutter, date column, entry gap, top padding. A missing `flex-direction: column` on the scroll container left the log at the left edge while every other number matched.
- Reproduce the empty state: the placeholder, the hidden delete control, the focused caret.
- Compare cropped, at the same window size.
- Walk interactions with `xdotool` and assert the database row, not the pixels: type → debounce → row `seq` + 1; delete → empty tombstone; Today → reload; wheel → older page.

## Verify the real window (Linux)

```bash
Xvfb :99 -screen 0 1200x800x24 -nolisten tcp &      # the background tool, not nohup
DISPLAY=:99 bun node_modules/gpuix-svelte/bin/gpuix-svelte.js --bun app.ts &
sleep 7
DISPLAY=:99 xwd -root -silent > root.xwd
convert root.xwd shot.png                            # crop to the window before reading it
```

- Drive it with `xdotool`: `mousemove <x> <y> click 1`, `type --delay 40 "text"`, `click --repeat 60 5` for the wheel.
- Assert persistence with `bun -e` and `bun:sqlite`.
- Crop the window before `vision_analyze`; full-screen shots time out.
- Record the window origin from the crop and add it to element coordinates.
- Kill by a pid resolved in a separate call.

## Build and ship

- `bun run build` produces one executable for the host. The GPUI addon is prebuilt for the host platform only, so cross-compiling embeds the wrong `.node`: build each OS on its own runner.
- macOS arm64: `macos-15`, `oven-sh/setup-bun@v2`, `bun install --frozen-lockfile`, `bun run build:app`, then `ditto -c -k --keepParent dist/<App>.app <App>-<version>-macos-arm64.zip`.
- A `.app` is the binary in `Contents/MacOS`, an `Info.plist`, and an `.icns` cut with `sips` + `iconutil`; ad-hoc sign with `codesign --force --deep --sign -` when there is no Developer ID. A downloaded ad-hoc app needs right-click → Open once.
- A Bun+GPUI `.app` is ~110MB, the `ditto` zip barely smaller and `tar -cJf` about a third. Telegram bots cap near 50MB: send the `.tar.xz`.
- That size is the runtime, not the app: a hello-world `bun build --compile` is nearly as large, and the addon adds ~24MB. Settle whether the product's download-size promise allows it before porting; if not, the port is a spike.

## Pitfalls

- **Unitless `line-height` means pixels.** `line-height: 1.65` draws every line 1.65px apart; write `31.35px` for 19px × 1.65.
- **A `<textarea>` has no auto-height.** It clips to `minRows`; measure wrapped lines with fontkit against the same TTF and pass `minRows`.
- **`hitbox="self"` on a clickable element whose children paint.** The click lands on the `<svg>`/`<text>` child, so an icon button does nothing and the handler is blamed.
- **`register_font()` before the window exists is a silent no-op** (`get_native()` is null), and a face arriving after an element painted cannot restyle it. Register in the root `$effect`, flip a ready flag and mount under `{#if ready}`; guard module-wide or a no-op first call consumes the attempt.
- **A quoted `font-family` falls back to the default sans.** `font-family: Newsreader` resolves, `'Newsreader'` does not, and a multi-word family cannot be unquoted at all — rename the face to one word. Confirm on a screenshot.
- **`render_hot` watches `.svelte` only.** Editing `app.ts` or any `.ts` module needs a restart; the window size lives in `app.ts`.
- **The Linux prebuild has no test renderer**, so `gpuix-svelte test` runs on macOS and Windows only; on Linux verify through the real window.
- **A compiled binary cannot carry the `.node` addon.** Bun embeds it, extracts to `$TMPDIR` and dlopens it there, so a noexec `/tmp` dies with `failed to map segment from shared object`; `--external` is no better, because a compiled binary resolves externals from the cwd. Copy the addon (`@gpuix/native-*/…node`) next to the executable — into `Contents/MacOS` for a `.app` — and resolve `@gpuix/native` to a virtual module doing `createRequire(process.execPath)(join(dirname(process.execPath), '<name>.node'))`; have CI launch the built app and wait for `mount complete`. The binary also shrinks, because the addon is no longer embedded twice.
- **`$state(new Map())` never re-runs the template.** `$state` does not proxy a `Map`, so `.set()`/`.delete()` invalidate nothing; use `new SvelteMap()` from `svelte/reactivity` and `.clear()` instead of replacing it.
- **A quit has no blur and no promise.** No window-blur or visibilitychange event exists, and a quitting process never resumes a pending promise, so a 300 ms debounce loses its last keystrokes. Flush from `process.on('exit')` with a synchronous write (open the store eagerly, keep the `Notes` handle). Take the counter from the store (`opened.day(day)?.seq + 1`), never from the page: the page advances its copy only after `await saveDay` resumes, so a quit during a save sends a counter the store already committed and the store refuses it. A kill signal runs no exit handler and still loses it.
- **Kill by literal pid, in its own call.** `ps -eo pid,args | grep "<script>" | xargs kill` matches the shell running it and dies with exit 143.
- **`fontkit` has no default ESM export**: `import { create } from 'fontkit'`.
- **No `@media`, `z-index`, `letter-spacing`, `transform`, `display: none`, `caret-color` or `text-transform`.** Responsive layout is a `window_size` comparison; overlays go last in document order or inside `<Portal>`.

## References

- `references/renderer-quirks.md` — the CSS/element/event subset, textarea sizing, fonts, scrolling, dialogs and testing.
- `templates/build-macos-app.ts` — the Bun build plus `.app` wrapper and ad-hoc signing, to copy beside an app and rename.
