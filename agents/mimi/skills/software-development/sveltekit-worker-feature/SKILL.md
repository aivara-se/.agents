---
name: sveltekit-worker-feature
description: "Use when adding auth features to SvelteKit + Worker."
version: 1.0.0
author: MiMi (thani-sh-mimi)
license: MIT
metadata:
  hermes:
    tags: [sveltekit, cloudflare-workers, d1, drizzle, auth, e2e, cron]
    related_skills: [web-frontend-delivery, page-geometry-cdp, testing, writing]
---

# Authenticated feature across SvelteKit and a Worker

## When to Use

A repo has a SvelteKit site and a Hono/D1 Worker API on separate hosts, and the feature needs accounts (a cookie), a new table and maybe a cron.

**Not for data that never leaves the device.** A journal, a streak or a set of marks for one person on one phone needs no account, no endpoint and no D1 row: `localStorage` on the web, DataStore on Android, `UserDefaults` on iOS. Reach for the server only when a second person or device must see it, and say which shape you are building first.

## The shape that works

1. **Proxy the API through the site** (`src/routes/api/[...path]/+server.ts`), never browser-to-Worker. Safari drops third-party cookies, so a cross-site `Set-Cookie` login fails on every iPhone.
2. **`params.path` already contains the version segment.** For `/api/[...path]`, the request `/api/v2/me` gives `path = "v2/me"`; `${origin}/v2/${params.path}` sends `/v2/v2/me` and returns a bare `404 Not Found`. Build `${origin}/${params.path}`.
3. **Forward method, body and every header except `host`/`content-length`**, and copy `Set-Cookie` back untouched. Compute cookie `secure` from the proxied URL — the Worker sees `https://` in production and `http://` locally.
4. **Default the dev origin from the environment, not `.env`**: `const DEFAULT_ORIGIN = dev ? 'http://127.0.0.1:8787' : 'https://api…'`, with `dev` from `$app/environment`.
5. **Identity is Better Auth's job** — do not hand-roll PBKDF2 and session tables.
6. **Idempotent cron**: a unique `dedupe_key` plus `INSERT OR IGNORE`. Put every dimension that should be unique in the key (supporter + subject + window) — keyed on the subject alone, the first friend's notification blocks the rest.
7. **Trigger the cron locally** with `wrangler dev --local --test-scheduled`, then `curl localhost:8787/__scheduled?cron=0+19+*+*+*`. No dev-only endpoint.

## Verification that survives review

- An e2e script (`scripts/e2e-*.mjs`, plain `fetch`, one cookie jar per user) registering two accounts and asserting isolation, the rules, the sweep and its idempotency — real HTTP against real D1, kept with a `package.json` script.
- Run it twice: on your dev port, and on the default `8787`. That proves the dev default.
- `bunx vitest run <path>` for pure logic. `bun run test` may be watch-mode and never exit; always pass `run`.

## Better Auth on Workers

1. `bun add better-auth @better-auth/drizzle-adapter`, then `app.all('/auth/*', (c) => getAuth(c.env).handler(c.req.raw))` with `basePath: '/auth'`, so the `/api/*` proxy lines up.
2. **Add `compatibility_flags: ["nodejs_compat"]`** to `wrangler.json` — scrypt needs it.
3. **Set `advanced.useSecureCookies` explicitly.** It follows `NODE_ENV`, unset in a Worker, so the cookie gets `Secure` while local dev runs over `http` and the browser drops it.
4. **A POST without an `Origin` header is rejected** with `MISSING_OR_NULL_ORIGIN` (403). Browsers send one; the e2e script must too, and that origin must be in `trustedOrigins`.
5. **The schema requires an email.** For a handle-only product, sign up with `${handle}@tracker.invalid` (RFC 2606) and sign in through the `username` plugin.
6. **Memoise the instance per `env` in a `WeakMap`** — rebuilding the adapter and its schema check per request is wasted work.
7. **`drizzle-kit generate` needs a TTY** and asks "created or renamed?" when one table disappears and another appears. Piping `\n` hangs it; `printf '\r'` advances the menu: `(sleep 4; printf '\r'; sleep 2; printf '\r'; ...) | script -qec "bunx drizzle-kit generate" /dev/null`
8. **Resolve the session with `auth.api.getSession({ headers: c.req.raw.headers })`** and map the result to your user ids; in Hono the raw `Request` is `c.req.raw`.
9. **Two error shapes meet in one client.** Better Auth answers `{ code }` — `USERNAME_IS_ALREADY_TAKEN` comes back as 400, not 422 — while your routes answer `{ error }`. Read both when mapping codes to copy, or a duplicate handle shows the generic message.
10. **Your SQL must use the library's names**: tables `user`, `session`, `account`, `verification`, handle in `username`, display name in `name`. Quote `"user"` in a JOIN.
11. **A test client's cookie jar has to match the prefix.** The session cookie is `<cookiePrefix>.session_token`; a jar keyed on a guessed `bt_session` stores nothing, every later call returns 401, and the run reads as broken auth. Store every cookie the response sets, and delete one whose `Max-Age` is 0.

## Pitfalls

- **`class:bg-sky-500/15={cond}` does not compile** — a directive name cannot contain `/`. Use `class={cond ? 'bg-sky-500/15' : '…'}`.
- **`bun run build` gets SIGKILLed when the dev server, `wrangler dev` and Chromium are all resident.** Kill them by PID, not `pkill -f`, which matches the shell running the kill.
- **Drizzle regenerate can re-emit an index a hand-written migration already created.** Patch it to `CREATE INDEX IF NOT EXISTS …`, or applying it fails.
- **`etag()` middleware answers `304` for authenticated JSON** — expected, not an auth failure.
- **A SvelteKit dev server restarted for `.env` changes keeps the old child alive**: the wrapper dies, `vite` keeps the port. Kill the child by PID from `ps`.
- **Do not publish a friend's exact count** in copy the other person sees. Say "has prayed little the last three days".
