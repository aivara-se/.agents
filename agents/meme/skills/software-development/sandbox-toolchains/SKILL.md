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

How a runtime or CLI gets onto this machine and stays working. `/root` is a
bind mount and survives a container rebuild; everything installed under
`/usr/local` does not. A rebuild therefore brings back the home directory and
its credentials while silently removing the binaries — a tool that was there
last week is simply `command not found` today.

## When to Use

- The operator asks to install, upgrade or pin a runtime or CLI (node, go,
  bun, gh, cloudflared) on this machine.
- A command that should exist answers `command not found`, especially just
  after a container rebuild.
- A build fails with `fork/exec /tmp/...: permission denied` or a tool writes
  to `/tmp` and cannot run what it produced.

## Procedure

1. Check what is actually present before installing anything:
   `which node go bun gh; node -v; go version; bun --version`. Report the
   before version; "install the latest" is meaningless without the delta.
2. Resolve the latest version from the project's canonical index, not from a
   search result or a memory of the version: `references/version-sources.md`.
   Several tools publish "latest" two different ways (Node's dist index covers
   every line, Go's `?mode=json` covers stable only); take the first entry of
   the index you queried and say which one it was.
3. Install the official release archive into `/usr/local` — never `apt`. The
   Debian packages for node, go and gh are years behind and the layout they
   use fights the tarball. Extract with `tar xJf`/`tar xzf`, move `bin/*` into
   `/usr/local/bin`, keep `lib/`, `include/` and `share/` beside it so npm's
   global prefix resolves to `/usr/local` (`npm prefix -g`).
4. Symlink the entry binary into `/usr/local/bin` when the archive has its own
   prefix (`ln -sf /usr/local/go/bin/go /usr/local/bin/go`) so PATH needs no
   edit; `/usr/local/bin` is already on it.
5. Verify with a real program, not `--version`: `node -e`, `bun -e`, and a
   two-line `go run .` in a scratch module under `/root`. `--version` proves
   the binary was copied; a run proves the toolchain works.
6. Clean up the download and the extracted tree. `/root` is the home the
   operator can see — leave no `*.tar.gz` or `node-vX-linux-x64/` behind.

## Pitfalls

- `/tmp` is mounted **noexec**, so anything that compiles to `$TMPDIR` and then
  executes it fails with `fork/exec /tmp/...: permission denied` even though
  the compile succeeded. For Go set `GOTMPDIR=/root/.cache/go-tmp` (persisted
  in `~/.bashrc`); for anything else point `TMPDIR` at `/root/tmp`. Do not
  "fix" this by symlinking `/tmp` or by running as another user.
- A missing binary usually means the login is still there: check the tool's
  config directory (`~/.config/gh`, `~/.cache`, `~/.npmrc`) before
  authenticating again, and re-authenticate only when the stored credential is
  genuinely absent or rejected. Re-installing over a live config is free;
  re-running a login flow is not.
- Upgrading node in place keeps the old `lib/node_modules` if you only copy
  `bin/`. Copy `bin/`, `lib/node_modules`, `include/node` and `share/` in one
  step, then re-read `npm -v` — a mismatched npm against a new node is the
  failure that surfaces later, in an unrelated install.
- `~/.bashrc` may not exist; appending an `export` with `grep -q || echo`
  creates it silently and correctly. Confirm the variable took effect with a
  fresh `bash -lc 'go env GOTMPDIR'` rather than trusting the append.
- `set -e` at the top of each install block and one tool per terminal call:
  a failing download then aborts only that tool and the progress already made
  is preserved.

## Done

Every requested tool answers a real invocation at the version the index
reported, and the reply states the before → after version for each one. A
missing tool that could not be installed is named with the error, never
omitted from the summary.
