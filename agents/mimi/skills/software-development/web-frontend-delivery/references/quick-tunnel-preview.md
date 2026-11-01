# Previewing a local build through a quick tunnel

## When

- The host builds only the default branch — a GitHub Pages site that deploys on push to `main` has no
  URL for a branch, so the reviewer has nothing to open.
- The operator judges a change by opening it and asks for a link; a description of what you measured is
  not the deliverable.
- You need the artifact on a phone, or on another network than the sandbox.

A host-published preview still outranks this: when the host builds the branch, use its URL and say so.
A quick tunnel is what you hand over when no such URL exists, and the link should be named as a tunnel,
not as the site.

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

Then verify **through the tunnel** before sending the link: each route's status (including the unknown
path), the page's own `<title>` and canonical, one font and one image, and a headless Chromium pass on
the tunnel URL — computed font families, the framework's hydration global, a click that navigates, and
zero console errors. A prerendered export loads its `_app/` assets by relative URL, so a wrong `base`
passes on localhost and breaks on the tunnel hostname; that pass is the check for it.

**Give it seconds, and poll for the node, not for `readyState`.** The edge fetches every module of a
dev-server page separately, so a drive that starts ~1s after `document.readyState === 'complete'` sees
the title and the dock but no content, and reads as a broken build. Wait until the rows the check is
about exist (with a deadline), then settle; a run whose only failures are content counts is early, not
broken.

## When the app has server routes

A static `build/` cannot answer an app whose pages are rendered per request or whose `/api/*` is a
proxy to a separate Worker. Building it produces a directory that 404s the routes the change is about.
Run the **real dev server** instead, and treat the tunnel as what it is: a public door onto a
throwaway local stack.

- Start the API (`wrangler dev --local`) and the site (`bun run dev`) first, and point the proxy at the
  local API (`API_ORIGIN`, or a `dev ?` default in the proxy route).
- Vite refuses the tunnel hostname on a dev server too (`server.allowedHosts`). Set
  `server: { allowedHosts: true }` **temporarily**, confirm it, and `git checkout --` the file before any
  commit — the tunnel is a demo, the config change must not outlive it.
- The database behind it is local and disposable, and **anyone with the link can register**. Say both in
  the message with the link, and keep every fixture account's password one you intended to publish.
- Verify through the tunnel, not on loopback: register a throwaway account over the tunnel URL, then
  `GET /api/v2/me` with its cookie must be 200. That one pair proves the proxy, the `Set-Cookie` rewrite
  and the first-party cookie all survived HTTPS in front of a local http origin.

**Seed the first screen.** A brand-new account lands on an empty app, and an empty app proves nothing.
Create a second account with a few days of plausible data — a friend whose week is partial, so the quiet
state and its action are visible — and give the operator its handle and password so one tap fills the
screen. Say which of the two accounts is theirs.

## Pitfalls

- **A preview that "does not show the change" is usually a cached document, not a stale server.** Before
  rebuilding anything, curl the tunnel URL for a string only the new build carries
  (`curl -s <url>/<route>/ | grep -c '<a marker>'`); when it is there the server is current and the
  operator's copy is old. Serve every response with `cache-control: no-store` — a static server that sends
  no cache headers lets the browser reuse the HTML heuristically — and after a rebuild hand over a **new**
  tunnel hostname rather than the one already opened. Say which of the two you changed, and that the
  served markup already matched the build.
- **`vite preview` refuses the tunnel hostname: `403 Blocked request. This host ("…trycloudflare.com") is
  not allowed`.** It is the preview server's own DNS-rebinding guard naming `preview.allowedHosts`, not the
  tunnel, the build or the edge. Do not add the random host to the repository's `vite.config.ts` and do not
  keep it. Serve the prerendered `build/` directory with a small static server instead (trailing slash →
  `index.html`, bare path → `301`), or run a real dev/serve command that has no host allowlist. Cloudflare
  caches the 403 on that hostname, so after switching servers start a **new** tunnel rather than reusing
  the URL: the same hostname keeps answering the cached refusal with `cf-cache-status: DYNAMIC`.
  A **dev** server has the same guard (`server.allowedHosts`, not `preview.allowedHosts`), which is why
  the temporary config change above is part of the dev-server path rather than an optional nicety.
- **Killing the background wrapper leaves the server holding the port.** `bun run preview` execs a child
  (`node …/vite preview`); killing the session pid kills the wrapper, the child keeps `:4173`, and the next
  server's `Bun.serve` fails to bind while the tool still reports "started". After every swap, request the
  port and check the body is the new server's, or `ps -eo pid,args | grep -E "vit[e]|serve"` and `kill` the
  child by pid.
- **Closing the tunnel means killing `cloudflared` itself.** The session id the background launch returns is
  the wrapper, and it can report `already_exited`/`backend_lost` while the real process still holds the
  connection. Resolve it with `pgrep -a cloudflared`, `kill <pid>`, then assert the URL answers **530** — the
  edge's "tunnel unavailable" — before telling the operator it is closed. Stop the app servers in the same
  pass: they existed only to feed the tunnel, and a dev server left behind serves the next run's confusion.
- **`ss` and `fuser` are not installed here.** Use `curl -o /dev/null -w '%{http_code}'` as the liveness
  check; `ps` for the pids.

- **`/tmp` is often mounted `noexec`.** A downloaded binary there fails with `Permission denied` while
  its mode already reads `755`. Put `cloudflared` under `$HOME` and run it from there.
- **The hostname is random and changes every run.** It is not the site's address: never write it into a
  document, a canonical tag or a repository file, and do not imply it will outlive the process.
- **A quick tunnel is public.** Anyone with the link reaches the port. Tunnel the built static artifact
  whenever a static artifact can serve the change; a dev server is acceptable only when the app has server
  routes (see above), and then only over a disposable local database. Never a directory listing of the
  repository root, and never anything holding real secrets.
- **It dies with the process and with the sandbox.** Say that in the same message as the link, and name
  the port so the operator can stop it.
- **A running process is not a working route.** Confirm the tunnel answers with `curl` and read the
  `<title>` back; a tunnel that came up but routes nowhere still prints its URL.
- **A plain static server is close to the host, not equal to it.** Directory requests answer `301` to
  the trailing-slash form, but its 404 and headers are its own. Check the routes the change touches
  rather than claiming parity with the deployment.
