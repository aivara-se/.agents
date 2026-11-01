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

Install runtimes and CLIs (node, go, bun, gh, anything else) so they still work next session. `/root` is the bind-mounted, persistent home; everything else in the container is disposable.

## When to Use

- A runtime, toolchain or CLI must be installed or upgraded here.
- A command is missing after a rebuild (`command not found`) and the fix is an install, not a code change.
- A tool is installed but stale, or at an unexpected path.

## Procedure

1. **Probe before installing.** `which -a node go bun gh; node -v; go version` — a previous session may have installed it, possibly an older version on another PATH.
2. **Resolve the version from the authoritative index**, never from memory:
   - node: `curl -sS https://nodejs.org/dist/index.json` (first entry; it also carries the bundled npm version).
   - go: `curl -sS https://go.dev/dl/?mode=json` (`stable: true` entry).
   - bun: `curl -sS https://api.github.com/repos/oven-sh/bun/releases/latest` (tag `bun-vX.Y.Z`).
   - gh: `apt-get install -y gh` on Debian trixie. Read these with a bounded extractor (a node/python or jq one-liner), never a pager: a terminal `head` on a large JSON body kills curl with `(23) Failure writing output to destination`.
3. **Unpack into `/root/.local/<tool>`**, not `/usr/local` and not `/tmp`:
   ```bash
   mkdir -p /root/.local/dl && cd /root/.local/dl
   curl -fsSLO https://nodejs.org/dist/vX.Y.Z/node-vX.Y.Z-linux-x64.tar.xz
   tar -xf node-vX.Y.Z-linux-x64.tar.xz
   rm -rf /root/.local/node && mv node-vX.Y.Z-linux-x64 /root/.local/node
   ```
   Go ships a tree meant to land as `/root/.local/go`: `rm -rf /root/.local/go && tar -C /root/.local -xzf goX.Y.Z.linux-amd64.tar.gz`. Bun: `BUN_INSTALL=/root/.local/bun curl -fsSL https://bun.sh/install | bash -s "bun-vX.Y.Z"`.
4. **Symlink every executable into `/usr/local/bin`.** Tool shells here are non-interactive and never source `~/.bashrc`, so PATH edits alone leave the tool invisible:
   ```bash
   for f in /root/.local/node/bin/* /root/.local/go/bin/* /root/.local/bun/bin/*; do
     ln -sf "$f" /usr/local/bin/"$(basename "$f")"; done
   ```
   Re-run `scripts/relink-toolchains.sh` after a rebuild — `/root` survives, `/usr/local/bin` does not.
5. **Also append PATH to `~/.bashrc` and `~/.profile`** for interactive sessions.
6. **Move caches and tmp off `/tmp`** (volatile, and sometimes mounted `noexec`): `go env -w GOTMPDIR=/root/.tmp/go GOMODCACHE=/root/go/pkg/mod GOCACHE=/root/.cache/go-build` — `go env -w` writes `~/.config/go/env`, which persists, unlike an exported variable.
7. **Verify twice**: from a clean environment `env -i PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin HOME=/root bash -c 'node -v; go version; bun -v'`, then a real smoke test (`go run` a two-line main, `bun` a `.ts` file, `node -e`) — a version banner proves the binary loads, not that the toolchain can build.
8. **Report the versions and the install root**, plus the command that restores the symlinks after a rebuild.

## Pitfalls

- `mv newdir /root/.local/node` when the target exists moves the tree _inside_ it, leaving the old version in place and burying the new one. `rm -rf` the target first.
- Tar preserves the archive's mtime and uid, so `ls -la` on a fresh extract can show an old date and a foreign owner. Judge what is installed by running the binary.
- `apt-get install` lands in `/usr` and is wiped on rebuild: fine for easy binaries (gh), wrong for toolchains whose version must be pinned — those go under `/root/.local`.
- npm's global prefix follows the active node (`npm config get prefix`); after switching node, confirm it resolves under `/root/.local/node`.
- Credentials in `~/.config/...` (e.g. `~/.config/gh/hosts.yml`) survive a rebuild while the binary does not: install the CLI, then check auth state before starting any auth flow.
