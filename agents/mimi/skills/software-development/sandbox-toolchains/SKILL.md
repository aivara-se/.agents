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

- Installing or upgrading a runtime or CLI (Node, Go, Bun, `gh`, `deno`, `rustup`, anything else) in the sandbox.
- A tool reports `command not found` that worked in an earlier session, or an old version shadows the one just installed.
- Setting `PATH`, `GOROOT`, `GOPATH` or `BUN_INSTALL` so they hold in every shell.

`$HOME` (`/root`) is a bind-mounted host directory and survives a container rebuild. `/usr/local` and the rest of the image do not. Everything a future session must still find goes under `~/.local`, so Node, Go, Bun, `gh` and friends belong there even when the image already ships an older copy.

## Procedure

1. **Find the real current version — never type one from memory.** Query the publisher:

   ```sh
   # Node (latest and LTS)
   curl -sS https://nodejs.org/dist/index.json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['version'], next(x['version'] for x in d if x['lts']))"
   # Go
   curl -sS 'https://go.dev/dl/?mode=json' | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['version'])"
   # Any GitHub-released tool
   curl -sS https://api.github.com/repos/<owner>/<repo>/releases/latest | python3 -c "import json,sys; print(json.load(sys.stdin)['tag_name'])"
   ```

   "Latest" means the current release line, not LTS. Install latest, then name the LTS in one line so the operator can pin it if he wants.

2. **Unpack into `~/.local`, keep the version in the directory name, symlink a stable name.** Download into `~/.local/src`:

   ```sh
   tar xJf node.tar.xz -C ~/.local                    # node ships .tar.xz
   ln -sfn ~/.local/node-vX.Y.Z-linux-x64 ~/.local/node
   tar xzf go.tar.gz -C ~/.local                      # go unpacks to ~/.local/go
   install -m 755 <unpacked>/bun ~/.local/bin/bun     # single static binary -> ~/.local/bin
   ```

   Delete the archives when done; `~/.local/src` is scratch, not storage.

   **Bun ships one binary and repo scripts still ask for `bunx`** (`bun run check` shells out to `bunx svelte-kit sync`), so give it the second name — Bun decides by `argv[0]`, a symlink is enough: `ln -sf ~/.local/bin/bun ~/.local/bin/bunx`. Skip it and the repository's own gate dies with `bun: command not found: bunx` before it runs a single test.

3. **Put PATH in both `~/.profile` and `~/.bashrc`.** `.profile` only covers login shells, and many tool invocations run non-login, so `.profile` alone leaves `go`/`bun` unresolved in the shell that matters. Guard the export with `case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) export PATH=... ;; esac` so re-sourcing never doubles PATH. Set `GOROOT=$HOME/.local/go`, `GOPATH=$HOME/go`, `BUN_INSTALL=$HOME/.local` there instead of on every call.

4. **PATH order decides which binary wins.** `~/.local/bin` and `~/.local/node/bin` go first, so an older copy the image ships in `/usr/local/bin` is shadowed. Confirm with `which -a node go bun gh` — don't assume the shadowing took.

5. **Verify twice: one login shell and one non-login shell.**

   ```sh
   bash -lc 'which node go bun; node -v; go version; bun --version'
   bash -c  'source ~/.bashrc; node -v; go version; bun --version'
   ```

   Run `hash -r` after moving or replacing a binary in the current session.

## Pitfalls

- **Anything installed into `/usr/local/bin` returns as `command not found` after the next rebuild**, because the image comes back without it. Reinstall into `~/.local/bin`; move an existing copy with `install -m 755 /usr/local/bin/<tool> ~/.local/bin/<tool> && rm /usr/local/bin/<tool>`, then `hash -r`.
- **Credentials usually outlive the binary.** Check the tool's config under `$HOME` (e.g. `~/.config/gh/hosts.yml`) before re-authenticating: re-login is a last resort, and a token is never guessed, invented or pasted into chat.
- **Moving `gh` out of the image breaks `git` too.** `git config --global credential.https://github.com.helper` stores the absolute path (`!/usr/bin/gh auth git-credential`), so the next `git fetch` or `git push` fails with `/usr/bin/gh: not found` while `gh` itself works. Repoint it at where the binary now lives: `git config --global --unset-all credential.https://github.com.helper` then `--add` the new path (plain set refuses — the key has several values), and the same for `gist.github.com`.
- **`write_file` refuses `/root/.profile` even when the file does not exist**, because the guard resolves the path from a stale view. Create `~/.profile` and `~/.bashrc` with a heredoc in `terminal`, and remove probe files afterwards.
- **Delete nothing that the image shipped without being asked.** List the older shadowed copy and its version, then offer to remove it.

## Reporting

Bullets, one per tool, with the version the binary actually printed and where it lives. One clause on the persistence choice (`~/.local`, survives rebuilds), then any leftover or version decision as a separate short note phrased as an offer.
