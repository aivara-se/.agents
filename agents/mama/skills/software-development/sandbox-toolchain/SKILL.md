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

## When to Use

- `command not found` for `node`, `npm`, `go`, `bun`, `gh`, `gofmt`.
- `--version` reports a version older than the task needs.
- After a container rebuild, before running any build, test or git-host command.
- `/usr/local/bin` looks empty while `~/.config/gh` or `~/.bun` still exist.

## What survives a rebuild

- Only `/root` is a bind-mounted home. `/usr/local`, `/etc` and `/tmp` are container filesystem: a rebuild takes every binary installed there, while `~/.bun`, `~/.config/gh` and `~/github` stay.
- So install system-wide (`/usr/local`) for the current container, and keep everything durable in `$HOME` — bun already installs to `~/.bun/bin`, gh's credentials are in `~/.config/gh/hosts.yml`, repos are in `~/github/<owner>/<repo>`.
- Delete the downloaded tarballs when done; they are large and re-fetchable.

## Procedure

1. Probe before installing: `uname -m`, then `which -a node go bun gh` and each `--version`. A version already on `PATH` may be older than the newest release, or a leftover from a prior install elsewhere — decide, do not assume.
2. Resolve the newest version from the upstream endpoint, never from memory:
   - node: `curl -s https://nodejs.org/dist/index.json | jq -r '.[0].version'`
   - go: `curl -s 'https://go.dev/dl/?mode=json' | jq -r '.[0].version'`
   - bun: `curl -s https://api.github.com/repos/oven-sh/bun/releases/latest | jq -r .tag_name`
   - gh: same GitHub-releases shape on `cli/cli`
3. Install, then print the version the binary actually reports — a silent `-s` curl plus `tar` can succeed on a truncated download.
   - node tarball: `node-vX-linux-x64.tar.xz` → `/usr/local/lib/nodejs`, symlink `node npm npx corepack` into `/usr/local/bin`. Install beside `/usr/bin` rather than over it, so the distro's package ownership stays intact.
   - go tarball: unpack to `/usr/local` (it creates `/usr/local/go`), symlink `go` and `gofmt` into `/usr/local/bin`, set `GOROOT`.
   - bun: `curl -fsSL https://bun.sh/install | bash` owns `~/.bun/bin`; do not copy the binary elsewhere, just `export BUN_INSTALL="$HOME/.bun"` and put that dir on `PATH`.
4. Persist `PATH` in two places, because login and non-login shells read different files: write `/etc/profile.d/zz-langs.sh` (exports `GOROOT`, `GOPATH`, `BUN_INSTALL`, `PATH`) and source or repeat it in `~/.bashrc`. `~/.bashrc` may not exist on a fresh container — create it rather than appending blindly.
5. Verify in fresh shells, not the current one: `bash -lc 'node -v; go version; bun -v'` and `bash -ic '…'`. A shell already running keeps the old `PATH` and hides a broken export.
6. Smoke test with real work, not just `--version`: compile a three-line `main.go` and run it, run a `.mjs` under node and a `.ts` under bun.

## Pitfalls

- **`/tmp` is a noexec tmpfs.** `go run`, a test binary or any compiled artifact placed there fails with `fork/exec … permission denied`, which reads like a compiler bug. Build and run from `$HOME` (`mkdir -p ~/tmp/<name>`), and treat any "permission denied" on a freshly built binary as the noexec mount before touching code.
- **A missing binary is not a missing credential.** When `gh` is gone but `~/.config/gh/hosts.yml` still holds a valid token, reinstall the binary; `gh auth login` is unnecessary and would rotate the token. Verify with `curl -H "Authorization: Bearer $TOK" https://api.github.com/user` before concluding auth is broken.
- **`gofmt -l` prints the file when it needs formatting** — an edit that puts a one-line `func` body on one line is unformatted; read the output rather than assuming silence.
- Do not `apt install` a language to get a newer version; distro packages lag and the tarball from upstream is the version the task asked for.
