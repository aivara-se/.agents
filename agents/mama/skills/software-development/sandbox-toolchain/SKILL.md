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

## When to use

- `command not found` for `node`, `npm`, `go`, `bun`, `gh` or `gofmt`.
- `--version` reports a version older than the task needs.
- After a container rebuild, before any build, test or git-host command.
- `/usr/local/bin` looks empty while `~/.config/gh` or `~/.bun` survive.

## What survives a rebuild

Only `/root` is a bind-mounted home; `/usr/local`, `/etc` and `/tmp` belong to the container, so a rebuild takes every binary installed there while `~/.bun`, `~/.config/gh` and `~/github` stay. Install system-wide for this container, keep durable state in `$HOME` (bun: `~/.bun/bin`, gh: `~/.config/gh/hosts.yml`, repos: `~/github/<owner>/<repo>`), and delete the tarballs when done.

## Procedure

1. Probe first: `uname -m`, `which -a node go bun gh`, each `--version`. A version already on `PATH` may be older than the newest release, or a leftover install — decide, do not assume.
2. Resolve the newest version from the upstream endpoint, never from memory:
   - node: `curl -s https://nodejs.org/dist/index.json | jq -r '.[0].version'`
   - go: `curl -s 'https://go.dev/dl/?mode=json' | jq -r '.[0].version'`
   - bun: `curl -s https://api.github.com/repos/oven-sh/bun/releases/latest | jq -r .tag_name`
   - gh: same GitHub-releases shape on `cli/cli`
3. Install, then print the version the binary reports: a silent `curl -s` plus `tar` can succeed on a truncated download.
   - node: `node-vX-linux-x64.tar.xz` → `/usr/local/lib/nodejs`, symlink `node npm npx corepack` into `/usr/local/bin`. Install beside `/usr/bin`, never over it, so distro package ownership stays intact.
   - go: unpack to `/usr/local` (it creates `/usr/local/go`), symlink `go` and `gofmt` into `/usr/local/bin`, set `GOROOT`.
   - bun: `curl -fsSL https://bun.sh/install | bash` owns `~/.bun/bin`; do not copy the binary elsewhere — set `BUN_INSTALL="$HOME/.bun"` and put that dir on `PATH`.
4. Persist `PATH` in two places, because login and non-login shells read different files: write `/etc/profile.d/zz-langs.sh` (`GOROOT`, `GOPATH`, `BUN_INSTALL`, `PATH`) and source or repeat it in `~/.bashrc`. Create that file on a fresh container; do not append blindly.
5. Verify in fresh shells, not the current one: `bash -lc 'node -v; go version; bun -v'` and `bash -ic '…'`. A running shell keeps the old `PATH` and hides a broken export.
6. Smoke-test with real work: compile and run a three-line `main.go`, a `.mjs` under node, a `.ts` under bun.

## Pitfalls

- **`/tmp` is a noexec tmpfs.** `go run`, a test binary or any compiled artifact there fails with `fork/exec … permission denied`, which reads like a compiler bug. Build from `$HOME` (`mkdir -p ~/tmp/<name>`); treat "permission denied" on a fresh binary as the mount before touching code.
- **A missing binary is not a missing credential.** When `gh` is gone but `~/.config/gh/hosts.yml` holds a valid token, reinstall the binary; `gh auth login` would rotate the token. Check with `curl -H "Authorization: Bearer ***" https://api.github.com/user`.
- **`gofmt -l` prints the file when it needs formatting** — a one-line `func` body is unformatted. Read the output; do not assume silence.
- Never `apt install` a language for a newer version; distro packages lag, and the upstream tarball is the version the task asked for.
