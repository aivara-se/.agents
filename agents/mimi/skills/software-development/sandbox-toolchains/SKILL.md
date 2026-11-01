---
name: sandbox-toolchains
description: Use when installing a CLI or toolchain in the sandbox.
version: 1.0.0
author: MiMi
license: MIT
metadata:
  hermes:
    tags: [sandbox, toolchain, install, node, go, bun, path]
    related_skills: [github, hermes-agent]
---

# Provisioning tools in the sandbox

## When to Use

- Installing or upgrading a runtime or CLI (Node, Go, Bun, `gh`, `deno`, `rustup`) in the sandbox.
- A tool reports `command not found` that worked in an earlier session, or an old version shadows the new one.
- Setting `PATH`, `GOROOT`, `GOPATH` or `BUN_INSTALL` so they hold in every shell.

`$HOME` (`/root`) is a bind-mounted host directory and survives a container rebuild; `/usr/local` and the rest of the image do not. Everything a future session must find goes under `~/.local`.

## Procedure

1. **Find the real current version — never type one from memory.**

   ```sh
   # Node (latest and LTS)
   curl -sS https://nodejs.org/dist/index.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['version'], next(x['version'] for x in d if x['lts']))"
   # Go
   curl -sS 'https://go.dev/dl/?mode=json' | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['version'])"
   # Any GitHub-released tool
   curl -sS https://api.github.com/repos/<owner>/<repo>/releases/latest | python3 -c "import json,sys; print(json.load(sys.stdin)['tag_name'])"
   ```

   Install latest, then name the LTS in one line so the operator can pin it.

2. **Unpack into `~/.local`, version in the directory name, stable symlink.** Download into `~/.local/src`:

   ```sh
   tar xJf node.tar.xz -C ~/.local                    # node ships .tar.xz
   ln -sfn ~/.local/node-vX.Y.Z-linux-x64 ~/.local/node
   tar xzf go.tar.gz -C ~/.local                      # go unpacks to ~/.local/go
   install -m 755 <unpacked>/bun ~/.local/bin/bun     # single static binary -> ~/.local/bin
   ```

   Delete the archives; `~/.local/src` is scratch.

   **Bun ships one binary and repo scripts still ask for `bunx`** (`bun run check` shells out to `bunx svelte-kit sync`), and Bun decides by `argv[0]`: `ln -sf ~/.local/bin/bun ~/.local/bin/bunx`. Without it the repo's gate dies with `bun: command not found: bunx` before a test runs.

3. **Put PATH in both `~/.profile` and `~/.bashrc`.** `.profile` covers login shells only and many tool calls are non-login. Guard the export with `case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) export PATH=... ;; esac` so re-sourcing never doubles PATH. Set `GOROOT=$HOME/.local/go`, `GOPATH=$HOME/go`, `BUN_INSTALL=$HOME/.local` there, not per call.

4. **PATH order decides which binary wins.** `~/.local/bin` and `~/.local/node/bin` go first, shadowing an older `/usr/local/bin` copy. Confirm with `which -a node go bun gh`.

5. **Verify twice: one login shell, one non-login.**

   ```sh
   bash -lc 'which node go bun; node -v; go version; bun --version'
   bash -c  'source ~/.bashrc; node -v; go version; bun --version'
   ```

   Run `hash -r` after moving or replacing a binary in the current session.

## Android builds

```sh
# JDK 21 (Temurin)
curl -sSL -o jdk21.tar.gz "https://api.adoptium.net/v3/binary/latest/21/ga/linux/x64/jdk/hotspot/normal/eclipse"
tar xzf jdk21.tar.gz -C ~/.local && ln -sfn "$(ls -d ~/.local/jdk-21* | head -1)" ~/.local/jdk

# cmdline-tools, then the packages the project pins
curl -sSL -o cmdline-tools.zip "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip"
python3 -c "import zipfile;zipfile.ZipFile('cmdline-tools.zip').extractall('/tmp/x')"
mv /tmp/x/cmdline-tools ~/.local/android-sdk/cmdline-tools/latest
chmod -R +x ~/.local/android-sdk/cmdline-tools/latest/bin   # the zip arrives without exec bits
```

`compileSdk = 37` resolves to `platforms;android-37.0`, not `platforms;android-37` — the plain guess fails with "Failed to find package". Use `--channel=3` (canary) to see the numbered platforms.

**`TMPDIR` pointing at `/tmp` breaks Room.** Its KSP processor extracts `libsqlitejdbc.so` and loads it; a noexec `/tmp` gives `UnsatisfiedLinkError: failed to map segment from shared object`, surfacing as `ExceptionInInitializerError` and reading like a compiler bug. Export `TMPDIR=$HOME/tmp` and `JAVA_TOOL_OPTIONS=-Djava.io.tmpdir=$HOME/tmp` for Gradle, Kotlin and KSP, and put `sdk.dir` in `apps/android/local.properties` (gitignored).

Gradle's daemon dies in a small sandbox when Chromium and a dev server are resident: kill them, then build with `--no-daemon --max-workers=2`.

## Pitfalls

- **Anything installed into `/usr/local/bin` returns as `command not found` after the next rebuild.** Move it: `install -m 755 /usr/local/bin/<tool> ~/.local/bin/<tool> && rm /usr/local/bin/<tool>`, then `hash -r`.
- **Credentials usually outlive the binary.** Check the tool's config under `$HOME` (e.g. `~/.config/gh/hosts.yml`) before re-authenticating: re-login is a last resort, and a token is never guessed or pasted into chat.
- **Moving `gh` breaks `git` too.** `git config --global credential.https://github.com.helper` stores an absolute path (`!/usr/bin/gh auth git-credential`), so `git fetch` fails with `/usr/bin/gh: not found` while `gh` works. Repoint it: `--unset-all` then `--add` the new path (a plain set refuses — the key has several values), and the same for `gist.github.com`.
- **`write_file` refuses `/root/.profile` even when the file does not exist**, because the guard resolves the path from a stale view. Create `~/.profile` and `~/.bashrc` with a heredoc in `terminal`, then remove probe files.
- **Delete nothing the image shipped without being asked.** List the older shadowed copy and its version, then offer to remove it.

## Reporting

One bullet per tool with the version it printed and where it lives, one clause on the persistence choice, then any leftover or version decision as a short offer.
