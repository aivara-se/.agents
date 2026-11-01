---
name: desktop-app-stack-choice
description: "Use when choosing a desktop app stack."
version: 1.0.0
author: MiMi
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags:
      [
        desktop,
        frameworks,
        tauri,
        electron,
        flutter,
        swiftsui,
        tinyjs,
        gpuix,
        size,
        testing,
      ]
    category: software-development
    related_skills: [svelte-native-desktop, change-planning, testing]
---

# Choosing a desktop app stack

Use when asked what to build a desktop app with, when comparing a framework's marketing size with what the product downloads, or when someone proposes a "native" stack for an app whose promise is a small download.

## Method

1. **Fix the constraints first**: platforms, the download-size promise, whether the app is text-heavy, whether the existing frontend must be reused. These decide more than benchmarks.
2. **Measure the artifact, not the website.** Build a hello-world for the target OS; report `.app`/installer size, zip size and cold start. Home pages quote the best case or none.
3. **Probe the text path before committing.** Type into a real window and check caret, selection, undo, IME and accessibility. A custom-drawn toolkit can look native and still lose on text editing; a webview gets the OS editor free.
4. **Count the test story**: can the packaged app be driven end-to-end on every target OS, or only the webview in a dev server? That decides maintenance cost.
5. **Reuse what exists.** A webview host keeps an existing web UI and moves only the backend; a custom renderer means rewriting every screen.

## The table (order of magnitude — re-measure before quoting)

- **SwiftUI** — lowest size; true native controls; macOS only; XCTest/XCUITest.
- **Neutralino** — small; system webview; thin API; no real E2E harness.
- **tinyjs** — small runtime; system webview; JS backend (txiki.js/QuickJS); no bundled UI E2E.
- **Tauri 2** — small to mid; system webview; Rust backend; WebdriverIO `@wdio/tauri-service` runs real E2E on Windows, Linux **and macOS**.
- **Wails v3** — mid; system webview; Go backend; Playwright hits the dev server, not the packaged window; still beta.
- **Slint / egui / iced** — mid; custom-drawn Rust; fast startup; weak text editing, IME, accessibility and test tooling.
- **Avalonia** — larger trimmed; .NET/Skia; headless XUnit UI tests first-class; C#/XAML.
- **Flutter** — large; custom Impeller renderer; strongest headless tests; Dart rewrite.
- **Compose Multiplatform** — largest with the JVM; Compose UI tests; Kotlin.
- **Electron** — largest; bundled Chromium + Node; best-in-class Playwright; lowest effort if size is negotiable.
- **gpuix-svelte** — a Bun compile plus the GPUI addon; native GPUI drawing; headless tests only on macOS/Windows; see `svelte-native-desktop`.

## Rules that survive the numbers

- **"Native" describes the drawing path, not the runtime.** A native-drawn app embedding a JS engine is 10× a webview app; a webview app is small because the engine is already on the machine. Ask which engine ships inside the bundle.
- **Set the artifact beside the incumbent's.** Build the current app for the same OS and quote both, then use a bare hello-world compile to isolate the runtime's fixed cost.
- **Size is a fixed cost.** Trimming feature code cannot pay down a bundled engine; only changing the host runtime can.
- **The test story is the hidden cost.** "Run the dev server in a browser" is not a test of the window that ships.
- **Look is a design decision, not a toolkit property.** Only SwiftUI gives system controls; every other stack renders what the stylesheet says.

## Default for this lab's apps

For a local, text-heavy app shipping three platforms at ~10 MB: **keep the webview host you have**; tinyjs is at the size/effort frontier. **Tauri 2** is the like-for-like move — same Svelte UI, similar size, packaging/signing/updater and genuine cross-platform E2E — at the cost of a small Rust backend. Electron only when testing effort outranks download size; SwiftUI only when the app becomes macOS-only.

## Sources

- Tauri size claim and app-size guide: https://v2.tauri.app/start/, https://v2.tauri.app/concept/size/
- Tauri E2E, incl. macOS embedded WebDriver: https://v2.tauri.app/develop/tests/webdriver/
- WebdriverIO Tauri platform support: https://webdriver.io/docs/desktop-testing/tauri/platform-support
- Wails FAQ and size: https://v3.wails.io/faq
- Avalonia headless testing: https://docs.avaloniaui.net/docs/testing/headless-xunit
- tinyjs size and runtime: https://tinyjs.app/
- Flutter macOS build/size tooling: https://docs.flutter.dev/perf/app-size

## References

- `references/artifact-size-audit.md` — measure the shipped `.app`, break a Mach-O binary into segments, and isolate the runtime's fixed cost with a hello-world compile.
