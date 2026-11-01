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

A repo has a SvelteKit site and a Hono/D1 Worker API on separate hosts, and the new feature needs accounts (a cookie), a new table and maybe a cron.

**Not for data that never has to leave the device.** A journal, a streak, a set of marks for one person on one phone needs no account, no endpoint and no D1 row: `localStorage` on the web, DataStore on Android, `UserDefaults` on iOS. Reach for the server only when a second person or a second device has to see it, and say which of the two shapes you are building before you build it — a personal feature that arrives with a login and a migration reads as scope nobody asked for.

## The shape that works

1. **Proxy the API through the site** (`src/routes/api/[...path]/+server.ts`), do not call the Worker directly from the browser. Safari drops third-party cookies, so a cross-site `Set-Cookie` login silently fails on every iPhone. Same-origin keeps the cookie first-party and the Worker needs no CORS/credentials story.
2. **`params.path` already contains the version segment.** For route `/api/[...path]`, the request `/api/v2/me` gives `path = "v2/me"`; building `${origin}/v2/${params.path}` sends `/v2/v2/me` and returns a bare `404 Not Found` (Hono's notFound). Build `${origin}/${params.path}`.
3. **Forward method, body and every header except `host`/`content-length`**, and copy `Set-Cookie` back untouched. Compute cookie `secure` from the proxied request URL — the Worker sees `https://` in production and `http://` locally, which is exactly right.
4. **Default the dev origin from the environment, not `.env`**: `const DEFAULT_ORIGIN = dev ? 'http://127.0.0.1:8787' : 'https://api…'`, with `dev` from `$app/environment`. `bun run dev` + `wrangler dev` then works with no setup, and production needs no var.
5. **Identity is Better Auth's job** — see below. Do not hand-roll PBKDF2 and session tables when the library fits.
6. **Idempotent cron**: a unique `dedupe_key` plus `INSERT OR IGNORE`, so a retried scheduled run cannot double-notify. Put every dimension that should be unique in the key (supporter + subject + window) — keyed on the subject alone, the first friend's notification blocks the rest.
7. **Trigger the cron locally** with `wrangler dev --local --test-scheduled`, then `curl localhost:8787/__scheduled?cron=0+19+*+*+*`. No dev-only endpoint in the code.

## Verification that survives review

- An e2e script (`scripts/e2e-*.mjs`, plain `fetch`, one cookie jar per user) that registers two accounts and asserts isolation, the rules, the sweep and its idempotency. Every assertion is a real HTTP call against real D1. Keep it in the repo with a `package.json` script.
- Run it twice: once on the port you developed on, once on the default `8787` — that is how the dev default gets proved.
- `bunx vitest run <path>` for pure logic (dates, streaks). `bun run test` may be watch-mode and never exit; always pass `run`.

## Better Auth on Workers

1. `bun add better-auth @better-auth/drizzle-adapter`, then `app.all('/auth/*', (c) => getAuth(c.env).handler(c.req.raw))` with `basePath: '/auth'`, so the site's `/api/*` proxy lines up with it.
2. **Add `compatibility_flags: ["nodejs_compat"]`** to `wrangler.json` — scrypt needs it.
3. **Set `advanced.useSecureCookies` explicitly.** It follows `NODE_ENV`, which is unset in a Worker, so the cookie gets marked `Secure` while local dev runs over `http` and the browser throws it away.
4. **A POST without an `Origin` header is rejected** with `MISSING_OR_NULL_ORIGIN` (403). Browsers always send one; the e2e script must too, and that origin must be in `trustedOrigins`.
5. **The schema requires an email.** For a handle-only product, sign up with `${handle}@tracker.invalid` (RFC 2606) and let the `username` plugin handle sign-in; nothing is ever sent there.
6. Memoise the instance per `env` in a `WeakMap` — rebuilding the adapter and its schema check on every request is wasted work.
7. `drizzle-kit generate` asks "created or renamed?" when a table disappears and another appears, and needs a TTY. Piping `\n` hangs it; `printf '\r'` advances the menu:
   `(sleep 4; printf '\r'; sleep 2; printf '\r'; ...) | script -qec "bunx drizzle-kit generate" /dev/null`
8. **Resolve the session for your own routes with `auth.api.getSession({ headers: c.req.raw.headers })`** and map what it returns to the shape your API publishes; in Hono the raw `Request` is `c.req.raw`, not the parsed one. This is the whole adapter between the library's identity and your user ids.
9. **Two error shapes meet in one client.** Better Auth answers `{ code }` — `USERNAME_IS_ALREADY_TAKEN` comes back as a 400, not a 422 — while your own routes answer `{ error }`. Keep one error class and read both when mapping codes to copy, or a duplicate handle shows the generic message.
10. **SQL you write must use the library's table and column names**: `user`, `session`, `account`, `verification`, with the handle in `username` and the display name in `name`. Quote `"user"` in a JOIN — it collides with the SQL keyword often enough that unquoted works until it does not.
11. **A test client's cookie jar has to match the prefix.** The session cookie is `<cookiePrefix>.session_token`; a jar keyed on a guessed `bt_session` stores nothing, every later call returns 401, and the run reads as broken auth. Store every cookie the response sets (and delete one whose `Max-Age` is 0) rather than matching a name.

## Pitfalls

- **`class:bg-sky-500/15={cond}` does not compile** — a class directive name cannot contain `/`. Use `class={cond ? 'bg-sky-500/15' : '…'}`.
- **`bun run build` gets SIGKILLed when the dev server, `wrangler dev` and Chromium are all resident** in a 7 GB sandbox. Kill them by PID (not `pkill -f`, which matches the shell running the kill) before building.
- **Drizzle regenerate can re-emit an index a hand-written migration already created.** Patch the new migration to `CREATE INDEX IF NOT EXISTS …`, or applying it to the existing database fails.
- **`etag()` middleware answers `304` for authenticated JSON** — expected, the browser reuses its copy; not an auth failure.
- **A SvelteKit dev server restarted for `.env` changes keeps the old child alive** — the `bun run dev` wrapper dies, `vite` keeps the port. Kill the child by its PID from `ps`.
- **Do not publish a friend's exact count** in copy the other person sees ("0 of 15 prayers"). Scorekeeping is not support: say "has prayed little the last three days" and leave the number to the server.
