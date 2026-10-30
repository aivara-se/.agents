---
name: desktop-app-stack-choice
description: "Use when choosing a desktop app stack."
version: 1.0.0
author: MiMi
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [desktop, frameworks, tauri, electron, flutter, swiftsui, tinyjs, gpuix, size, testing]
    category: software-development
    related_skills: [svelte-native-desktop, change-planning, testing]
---

# Choosing a desktop app stack

## When to use

- "What should we build this desktop app with?" — a new app, or a migration off the current one.
- Comparing a framework's marketing size with what the product must download and install.
- Someone proposes a "native" stack for an app whose promise is a small download.

## Method

1. **Fix the constraints first**: platforms, the download-size promise, whether the app is
   text-heavy, and whether the existing frontend must be reused. These decide more than benchmarks.
2. **Measure the artifact, not the website.** Build a hello-world for the target OS and report
   `.app`/installer size, zip size and cold start. Framework home pages quote the best case
   (`<600KB` for Tauri) or none at all; the shipped app is the number that matters.
3. **Probe the text path before committing.** For a notes/editor app, type into a real window,
   check caret, selection, undo, IME and accessibility. A custom-drawn toolkit can look native
   and still lose on text editing; a webview gets the OS editor for free.
4. **Count the test story**: can the packaged app be driven end-to-end on every target OS, or
   only the webview in a dev server? That decides the maintenance cost, not the language.
5. **Reuse what exists.** If the product is a web frontend today, a webview host keeps the UI
   and only the backend moves; a custom renderer means a full rewrite of every screen.

## The table (order of magnitude, 2026 — re-measure before quoting)

- **SwiftUI** — 1–2.5 MB `.app`; true native controls; macOS only; XCTest/XCUITest.
- **Neutralino** — ~2–3 MB; system webview; thin API; no real E2E harness.
- **tinyjs** — ~6 MB runtime (measured Pereda app 8.2 MB); system webview; JS backend
  (txiki.js/QuickJS); no bundled UI E2E, test the backend and drive the window by hand.
- **Tauri 2** — ~5–12 MB (official minimum <600 KB); system webview; Rust backend; the
  WebdriverIO `@wdio/tauri-service` runs real E2E on Windows, Linux **and macOS** via an
  embedded WebDriver.
- **Wails v3** — ~10–15 MB; system webview; Go backend; Playwright runs against the dev server,
  not the packaged window; v3 still beta.
- **Slint / egui / iced** — ~3–15 MB; custom-drawn Rust; fast startup; weak text editing, IME,
  accessibility and UI-test tooling for an editor-class app.
- **Avalonia** — 17–45 MB trimmed; .NET/Skia; headless XUnit UI tests are first-class; C#/XAML.
- **Flutter** — ~35–45 MB macOS release; custom Impeller renderer; widget + integration tests
  are the strongest headless story; Dart rewrite.
- **Compose Multiplatform** — 45–100 MB with the JVM; Compose UI tests; Kotlin.
- **Electron** — 150–200 MB; bundled Chromium + Node; Playwright is best-in-class; lowest
  effort if the size promise is negotiable.
- **gpuix-svelte** — measured 114.8 MB `.app` (109 MB of it a bare Bun compile); native GPUI
  drawing; headless tests only on macOS/Windows; see `svelte-native-desktop`.

## Rules that survive the numbers

- **"Native" describes the drawing path, not the runtime.** A native-drawn app that embeds a
  JS engine is 10× a webview app; a webview app is small because the engine is already on the
  machine. Ask which engine ships inside the bundle.
- **Set the artifact beside the incumbent's.** A framework's size answers nothing alone: build the current app for the same OS and quote both, then use a bare hello-world compile to isolate the runtime's fixed cost (a Bun-compiled binary is ~109 MB before any app code).
- **Size is a fixed cost, not proportional to the app.** Trimming feature code cannot pay down
  a bundled engine; only changing the host runtime can.
- **The test story is the hidden cost.** Playwright/Electron, Flutter widget tests, Avalonia
  headless and Tauri's embedded WebDriver are real; "run the dev server in a browser" is not a
  test of the window that ships.
- **Look is a design decision, not a toolkit property.** Only SwiftUI gives system controls;
  every other stack renders what the stylesheet tells it, so a plain, native-looking layout
  ports across webview, Flutter and GPUI alike.

## Default for this lab's apps

For a local, text-heavy app that ships three platforms at ~10 MB (the Pereda shape): **keep the
webview host you have**; tinyjs is already at the size/effort frontier. **Tauri 2** is the one
like-for-like move — same Svelte UI, similar size, packaging/signing/updater and genuine
cross-platform E2E — at the cost of a small Rust backend. Electron only when testing effort
outranks download size; SwiftUI only when the app becomes macOS-only.

## Sources

- Tauri size claim and app-size guide: https://v2.tauri.app/start/, https://v2.tauri.app/concept/size/
- Tauri E2E, incl. macOS embedded WebDriver: https://v2.tauri.app/develop/tests/webdriver/
- WebdriverIO Tauri platform support: https://webdriver.io/docs/desktop-testing/tauri/platform-support
- Wails FAQ and size: https://v3.wails.io/faq
- Avalonia headless testing: https://docs.avaloniaui.net/docs/testing/headless-xunit
- tinyjs size and runtime: https://tinyjs.app/
- Flutter macOS build/size tooling: https://docs.flutter.dev/perf/app-size

## References

- `references/artifact-size-audit.md` — measure the shipped `.app`, break a Mach-O binary into
  segments, and isolate the runtime's fixed cost with a hello-world compile.
