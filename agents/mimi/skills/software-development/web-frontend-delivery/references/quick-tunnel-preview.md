# Previewing a local build through a quick tunnel

## When

The host builds only the default branch and has no URL for a branch; the operator judges by opening it; or the artifact is needed on a phone. A host-published preview outranks this: when the host builds the branch, use its URL. Call a quick tunnel a tunnel, not the site.

## Procedure

```bash
# 1. the artifact the host would serve
bun run build

# 2. serve the output directory on loopback, in the background
cd build && python3 -m http.server 4173 --bind 127.0.0.1

# 3. the tunnel — install once, into a directory that allows execution
curl -sL -o ~/cloudflared \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x ~/cloudflared
~/cloudflared tunnel --url http://127.0.0.1:4173 --no-autoupdate 2>&1 | tee ~/tunnel.log

# 4. read the hostname out of the log, after about ten seconds
grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" ~/tunnel.log | head -1
```

Then verify **through the tunnel** before sending the link: each route's status (including the unknown path), the page's own `<title>` and canonical, one font and one image, and a headless Chromium pass — computed font families, the hydration global, a navigating click, zero console errors. A prerendered export loads `_app/` by relative URL, so a wrong `base` passes on localhost and breaks on the tunnel hostname.

**Poll for the node, not for `readyState`.** The edge fetches every module separately, so a drive that starts at `complete` sees the title but no content and reads as a broken build. Wait for the rows the check is about.

## When the app has server routes

A static `build/` cannot answer pages rendered per request or an `/api/*` proxy; it 404s the routes the change is about. Run the **real dev server**, and treat the tunnel as a public door onto a throwaway stack.

- Start the API (`wrangler dev --local`) and the site (`bun run dev`), and point the proxy at the local API (`API_ORIGIN`, or a `dev ?` default in the proxy route).
- Vite refuses the tunnel hostname on a dev server too (`server.allowedHosts`). Set `server: { allowedHosts: true }` **temporarily** and `git checkout --` the file before any commit.
- The database is local and disposable, and **anyone with the link can register**. Say both with the link, and keep every fixture password one you meant to publish.
- Verify through the tunnel, not on loopback: register a throwaway account, then `GET /api/v2/me` with its cookie must be 200. That pair proves the proxy, the `Set-Cookie` rewrite and the first-party cookie survived HTTPS in front of a local http origin.

**Seed the first screen.** A new account lands on an empty app, which proves nothing. Create a second account with a partial week of data, so the quiet state and its action are visible, and give the operator its credentials. Say which account is theirs.

## Pitfalls

- **A preview that "does not show the change" is usually a cached document.** Curl the tunnel URL for a string only the new build carries before rebuilding; when it is there, the operator's copy is old. Serve with `cache-control: no-store` and hand over a **new** hostname after a rebuild.
- **`vite preview` refuses the tunnel hostname: `403 Blocked request`.** That is the preview server's DNS-rebinding guard (`preview.allowedHosts`), not the tunnel or the edge. Do not add the host to `vite.config.ts`; serve the prerendered `build/` with a small static server instead (trailing slash → `index.html`, bare path → `301`). Cloudflare caches the 403 on that hostname, so start a **new** tunnel.
- **Killing the background wrapper leaves the server holding the port.** `bun run preview` execs a child; kill the wrapper and the child keeps `:4173`, so the next server fails to bind while the tool reports "started". After every swap, request the port and check the body is the new server's.
- **Closing the tunnel means killing `cloudflared` itself.** The session id is the wrapper, and it can report `already_exited` while the real process holds the connection. `pgrep -a cloudflared`, `kill <pid>`, then assert the URL answers **530** before telling the operator it is closed. Stop the app servers too.
- **`ss` and `fuser` are not installed here.** Use `curl -o /dev/null -w '%{http_code}'`; `ps` for pids. **`/tmp` is often `noexec`**: a binary there fails with `Permission denied` while its mode reads `755`, so put `cloudflared` under `$HOME`.
- **The hostname is random and changes every run.** Never write it into a document, a canonical tag or a repository file.
- **A quick tunnel is public.** Anyone with the link reaches the port. Tunnel the built artifact whenever it can serve the change; a dev server only for server routes, over a disposable database. Never the repository root, never real secrets.
- **It dies with the process and with the sandbox.** Say so with the link, name the port, and remember that a running process is not a working route: confirm with `curl` and read the `<title>` back.
- **A plain static server is close to the host, not equal.** Its 404 and headers are its own. Check the routes the change touches.
