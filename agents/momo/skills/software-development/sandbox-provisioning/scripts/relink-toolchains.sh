#!/bin/sh
# Re-link toolchains installed under /root/.local into /usr/local/bin.
# Only ~ persists across a sandbox rebuild; /usr/local/bin does not.
set -e

for bindir in /root/.local/node/bin /root/.local/go/bin /root/.local/bun/bin; do
  [ -d "$bindir" ] || continue
  for f in "$bindir"/*; do
    [ -x "$f" ] && ln -sf "$f" /usr/local/bin/"$(basename "$f")"
  done
done

command -v node >/dev/null && node -v || true
command -v go >/dev/null && go version || true
command -v bun >/dev/null && bun -v || true
exit 0
