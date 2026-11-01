---
name: sandbox-toolchain
description: Install or restore node, go, bun, gh in the sandbox.
version: 1.0.0
author: MaMa
license: MIT
when-to-use: A command is missing (`command not found`), a version is stale, or a rebuilt sandbox needs its toolchain back before any build or test.
metadata:
  hermes:
    tags: [toolchain, node, go, bun, gh, setup, sandbox]
    category: software-development
    related_skills: [github, coding, testing]
---

# Sandbox toolchain

## What survives a rebuild

Only `/root` is a bind-mounted home. `/usr/local`, `/etc` and `/tmp` belong to the container, so a rebuild takes every binary installed there. `~/.bun`, `~/.config/gh` and `~/github` stay.

Install system-wide for the container; keep what must last in `$HOME`. Delete the tarballs when done.

## Procedure

1. Probe first: `uname -m`, then `which -a node go bun gh` and each `--version`. A binary on `PATH` may be older than the release you need, or a leftover from another install.
2. Resolve the newest version from upstream, never from memory:
   - node: `curl -s https://nodejs.org/dist/index.json | jq -r '.[0].version'`
   - go: `curl -s 'https://go.dev/dl/?mode=json' | jq -r '.[0].version'`
   - bun: `curl -s https://api.github.com/repos/oven-sh/bun/releases/latest | jq -r .tag_name`
   - gh: the same shape on `cli/cli`
3. Install, then print the version the binary reports. A silent curl plus `tar` can succeed on a truncated download.
   - **node**: `node-vX-linux-x64.tar.xz` into `/usr/local/lib/nodejs`, symlink `node npm npx corepack` into `/usr/local/bin`. Install beside `/usr/bin`, not over it.
   - **go**: unpack to `/usr/local`, symlink `go` and `gofmt` into `/usr/local/bin`, set `GOROOT`.
   - **bun**: the installer owns `~/.bun/bin`. Do not copy the binary elsewhere; export `BUN_INSTALL="$HOME/.bun"`.
4. Persist `PATH` in two places, because login and non-login shells read different files: `/etc/profile.d/zz-langs.sh` (`GOROOT`, `GOPATH`, `BUN_INSTALL`, `PATH`), repeated in `~/.bashrc`. Create that file if the container has none.
5. Verify in fresh shells: `bash -lc 'node -v; go version; bun -v'` and `bash -ic '…'`. A running shell keeps the old `PATH` and hides a broken export.
6. Smoke-test with real work: compile a three-line `main.go` and run it, run a `.mjs` under node and a `.ts` under bun.

## The Android gate

Reviewing `aivara-se/pereda`'s `apps/android` needs a JVM the sandbox does not ship.

1. `apt-get install -y openjdk-21-jdk-headless unzip`.
2. Command-line tools into `$HOME/android-sdk/cmdline-tools/latest`, then `yes | sdkmanager --licenses` and `sdkmanager "platforms;android-37.0" "build-tools;37.0.0" "platform-tools"`. `compileSdk = 37` wants `platforms;android-37.0`; plain `platforms;android-37` is not in the manifest.
3. `printf 'sdk.dir=%s\n' "$HOME/android-sdk" > local.properties` in the app directory, with `ANDROID_HOME` and `GRADLE_USER_HOME=$HOME/.gradle` exported.
4. Run with `--no-daemon --max-workers=2 -Dorg.gradle.jvmargs=-Xmx1536m`. The project's 2 GB heap plus the Kotlin daemon kills the daemon on a 7.5 GB sandbox: "daemon disappeared".

## The browser for page tests

- The Playwright browsers live in `/opt/playwright`; keep `PLAYWRIGHT_BROWSERS_PATH=/opt/playwright` set, or a scratch install downloads a second copy into `~/.cache`.
- `bun add playwright` in a scratch directory gives the client. `bunx playwright install webkit` fetches the engine, but it launches only after `bunx playwright install-deps webkit`, which installs `libgtk-4-1` and the rest. Without it the launch error names the package.
- A page that ships in a tinyjs app runs in WKWebView or WebKitGTK. Run the same script under `webkit`, not only Chromium; a Chromium pass says nothing about the shipped engine.

## Pitfalls

- **`/tmp` is a noexec tmpfs.** `go run` and any compiled artifact there fail with `fork/exec … permission denied`, which reads like a compiler bug. Build from `$HOME` (`mkdir -p ~/tmp/<name>`).
- **A missing binary is not a missing credential.** With `gh` gone and a valid token in `~/.config/gh/hosts.yml`, reinstall the binary. `gh auth login` rotates the token.
- **`gofmt -l` prints the file when it needs formatting.** Read the output.
- **A JVM dependency that unpacks a native library fails under noexec `/tmp`.** `sqlite-jdbc` extracts into `java.io.tmpdir`, so tests die at `DriverManager.getConnection` with `UnsatisfiedLinkError`. Aim the JVM at `$HOME` from an init script (`tasks.withType(Test) { systemProperty 'java.io.tmpdir', "$HOME/tmp/jvm" }`), never by editing the repository.
- Do not `apt install` a language for a newer version. Distro packages lag; use the upstream tarball.
