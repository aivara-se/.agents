---
name: sandbox-toolchains
description: "Install or repair dev toolchains in my sandbox."
version: 1.0.0
author: MeMe
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [sandbox, install, toolchain, node, go, bun, gh, path]
    category: software-development
    related_skills: [github, coding, testing]
---

# Sandbox toolchains

`/root` is a bind mount and survives a container rebuild; everything under `/usr/local` does not. A rebuild brings back the home directory and its credentials and removes the binaries, so a tool that worked last week answers `command not found` today.

## When to Use

- The operator asks to install, upgrade or pin a runtime or CLI (node, go, bun, gh, cloudflared) on this machine.
- A command that should exist answers `command not found`, especially after a rebuild.
- A build fails with `fork/exec /tmp/...: permission denied`.

## Procedure

1. Check what is present before installing: `which node go bun gh; node -v; go version; bun --version`. Report the before version.
2. Resolve the latest version from the canonical index, not a search result or memory: `references/version-sources.md`. Node's index covers every line, Go's `?mode=json` stable only — take the first entry and say which index you used.
3. Install the official release archive into `/usr/local`, never `apt`: the Debian packages are years behind and their layout fights the tarball. Extract with `tar xJf`/`tar xzf`, move `bin/*` into `/usr/local/bin`, keep `lib/`, `include/` and `share/` beside it so `npm prefix -g` resolves to `/usr/local`.
4. Symlink the entry binary into `/usr/local/bin` when the archive has its own prefix (`ln -sf /usr/local/go/bin/go /usr/local/bin/go`); `/usr/local/bin` is already on PATH.
5. Verify with a real program, not `--version`: `node -e`, `bun -e`, a two-line `go run .` in a scratch module. `--version` proves the binary was copied; a run proves the toolchain works.
6. Clean up the download and the extracted tree. `/root` is the home the operator sees: leave no `*.tar.gz` or `node-vX-linux-x64/`.

## Pitfalls

- `/tmp` is mounted **noexec**, so anything compiled to `$TMPDIR` and then run fails with `fork/exec /tmp/...: permission denied` though the compile succeeded. Set `GOTMPDIR=/root/.cache/go-tmp` for Go (persisted in `~/.bashrc`) and `TMPDIR=/root/tmp` for anything else. Do not symlink `/tmp` or run as another user.
- A missing binary usually means the login survives: check `~/.config/gh`, `~/.cache` and `~/.npmrc` before authenticating again. Re-installing over a live config is free; a login flow is not.
- Upgrading node in place keeps the old `lib/node_modules` if you copy only `bin/`. Copy `bin/`, `lib/node_modules`, `include/node` and `share/` in one step, then re-read `npm -v`: a mismatched npm surfaces later, in an unrelated install.
- A bun tarball install can leave `bunx` out of `/usr/local/bin`, and a repository script that calls `bunx` then fails with `command not found: bunx`. Symlink it: `ln -sf /usr/local/bin/bun /usr/local/bin/bunx`. Fix the sandbox, never the repository's script.
- `~/.bashrc` may not exist; `grep -q || echo` creates it. Confirm with `bash -lc 'go env GOTMPDIR'` rather than trusting the append.
- `set -e` at the top of each install block, one tool per terminal call: a failing download aborts only that tool and the progress made survives.

## Done

Every requested tool answers a real invocation at the version the index reported, and the reply states before → after for each. A tool that could not be installed is named with its error, never omitted.
