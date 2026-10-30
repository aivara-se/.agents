---
name: sandbox-provisioning
description: "Install toolchains so they survive a sandbox rebuild."
version: 1.0.0
author: MoMo (aivara-se)
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [toolchain, node, go, bun, install, sandbox, path, provisioning]
    category: software-development
---

# Sandbox provisioning

Installing language runtimes and CLIs into this Docker sandbox (node, go, bun, gh, anything
else) so the install still works next session. `/root` is the bind-mounted, persistent
home; everything else in the container is disposable.

## When to Use

- The user asks to install or upgrade a runtime, toolchain, or CLI here (node, go, bun, rust,
  python, gh, ripgrep, ...).
- A command is missing after a rebuild (`command not found`) and the fix is an install, not a
  code change.
- A tool is installed but the version is stale or sits at an unexpected path.

## Procedure

1. **Probe before installing.** `which -a node go bun gh; node -v; go version` — a previous
   session may have installed it, and it may be an older version on a different PATH.
2. **Resolve the current version from the authoritative index**, never from memory:
   - node: `curl -sS https://nodejs.org/dist/index.json` (first entry). Prefer the current
     line the user asked for; the JSON also carries the bundled npm version.
   - go: `curl -sS https://go.dev/dl/?mode=json` (`stable: true` entry).
   - bun: `curl -sS https://api.github.com/repos/oven-sh/bun/releases/latest` (tag `bun-vX.Y.Z`).
   - gh: `apt-get install -y gh` on Debian trixie (present in the distro repo).
   Read these with a bounded extractor (a node/python or jq one-liner over the JSON), never a
   pager: a terminal `head` on a large JSON body kills curl with
   `(23) Failure writing output to destination`.
3. **Unpack into `/root/.local/<tool>`**, not `/usr/local` and not `/tmp`:
   ```bash
   mkdir -p /root/.local/dl && cd /root/.local/dl
   curl -fsSLO https://nodejs.org/dist/vX.Y.Z/node-vX.Y.Z-linux-x64.tar.xz
   tar -xf node-vX.Y.Z-linux-x64.tar.xz
   rm -rf /root/.local/node && mv node-vX.Y.Z-linux-x64 /root/.local/node
   ```
   Go ships a tree meant to land as `/root/.local/go` directly:
   `rm -rf /root/.local/go && tar -C /root/.local -xzf goX.Y.Z.linux-amd64.tar.gz`.
   Bun: `BUN_INSTALL=/root/.local/bun curl -fsSL https://bun.sh/install | bash -s "bun-vX.Y.Z"`.
4. **Symlink every executable into `/usr/local/bin`.** Tool shells here are non-interactive and
   never source `~/.bashrc`, so PATH edits alone leave the tool invisible:
   ```bash
   for f in /root/.local/node/bin/* /root/.local/go/bin/* /root/.local/bun/bin/*; do
     ln -sf "$f" /usr/local/bin/"$(basename "$f")"; done
   ```
   Re-run `scripts/relink-toolchains.sh` after a rebuild — `/root` survives, `/usr/local/bin` does not.
5. **Also append PATH to `~/.bashrc` and `~/.profile`** for interactive/login sessions, so the
   source of truth stays visible next to the symlinks.
6. **Move caches and tmp off `/tmp`** (it is volatile and intermittently mounted `noexec`):
   `go env -w GOTMPDIR=/root/.tmp/go GOMODCACHE=/root/go/pkg/mod GOCACHE=/root/.cache/go-build`
   — `go env -w` writes `~/.config/go/env`, which is persistent, unlike an exported variable.
7. **Verify twice**: from a clean environment
   `env -i PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin HOME=/root bash -c 'node -v; go version; bun -v'`,
   then a real smoke test (`go run` a two-line main, `bun` a `.ts` file, `node -e`) — a version
   banner proves the binary loads, not that the toolchain can build.
8. **Report the installed versions and the install root**, plus the one command that restores
   the symlinks after a rebuild.

## Pitfalls

- `mv newdir /root/.local/node` when `/root/.local/node` already exists moves the tree *inside*
  it, leaving the old version in place and the new one buried. `rm -rf` the target first.
- Tar preserves the archive's mtime and uid, so `ls -la` on a fresh extract can show an old date
  and a foreign owner. Judge what is installed by running the binary, not by the timestamp.
- `apt-get install` lands in `/usr` and is wiped on rebuild: fine for easily reinstalled binaries
  (gh), wrong for toolchains whose version must be pinned — those go under `/root/.local`.
- npm's global prefix follows the active node (`npm config get prefix`); after switching node,
  confirm it resolves under `/root/.local/node` so `npm i -g` stays on PATH.
- Credentials stored in `~/.config/...` (e.g. `~/.config/gh/hosts.yml`) survive a rebuild while the
  binary does not: install the CLI, then check auth state before starting any auth flow.
