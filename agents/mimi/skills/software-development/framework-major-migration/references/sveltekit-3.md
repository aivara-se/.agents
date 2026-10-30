# SvelteKit 2 → 3

## Command

```bash
npx sv migrate sveltekit-3 --tasks all --confirm --install bun
```

- Task-based migration in `sv`. Prerequisite tasks (`package-json`, `tsconfig`)
  always run; the rest are selectable.
- Full task list: `package-json`, `tsconfig`, `svelte-config`, `environment`,
  `paths`, `external-redirects`, `shallow-routing`, `params`, `imports`,
  `lib-alias`, `app-state`, `collect-migration-instructions`.
- `collect-migration-instructions` writes `MIGRATION_TASKS.md`; delete it when
  the migration is complete. Also grep for `@migration-task` comments.
- `sv` formats the result with the project's `format`/`fmt` script after the
  tasks run (a repo-wide `prettier --write .` if it has none) — see the
  pitfalls in the parent skill.

## Version floors (SvelteKit 3 requires)

- Node v22.17 · TypeScript v6 · Svelte v5.57.1 · Vite v8.0.12 (first Vite 8
  bundling stable `rolldown` v1) · `@sveltejs/vite-plugin-svelte` v7.
- Installed line observed: `@sveltejs/kit` ^3, `@sveltejs/adapter-cloudflare` ^8,
  `svelte-check` ^4.7.

## Breaking changes to check for

- **Config moves out of `svelte.config.js` into the `sveltekit()` Vite plugin in
  `vite.config.*`.** Supported since 2.62, so a project already configured
  there needs no change; `svelte.config.js` is no longer read at all.
  `kit.*` options become top-level plugin options; `vitePlugin`,
  `preloadStrategy`, `prerender.origin` and `csrf.checkOrigin` are removed.
- **`$lib` → `#lib` subpath imports**, declared in `package.json` `imports`
  (`#lib`, `#lib/*`), and every import gains an extension (`.js`, or
  `/index.js` for a directory). The old alias is no longer generated.
- **`tsconfig.json` extends `$app/tsconfig`**, not `./.svelte-kit/tsconfig.json`,
  and specifies its own `include`/`exclude` (the generated config supplies
  neither). A service worker is its own TS project extending
  `$app/tsconfig/service-worker`.
- **`$app/environment` → `$app/env`**; `$env/*` → `$app/env/private` and
  `$app/env/public`; explicit environment variables in `src/env.ts` are out of
  `experimental`.
- **`$app/stores` removed → `$app/state`** (read `page`, not `$page`);
  `page.url` is readonly.
- **`$service-worker` removed** → `version` from `$app/env`, `assets`/`immutable`/
  `prerendered` from `$app/manifest`, `resolved` from `$app/paths`.
- **`$app/paths`:** `base`/`assets`/`resolveRoute` removed → `asset()` / `resolve()`;
  `Pathname`/`Asset` renamed `Path`/`AssetPath`; the leading `/` is gone from
  those types.
- **Shallow routing** via `goto(url, { shallow: true })`; `invalidateAll` →
  `refreshAll`; `goto` options renamed (`keepFocus`+`noScroll` → `reset: false`,
  `replaceState` → `replace`).
- **External redirects** must opt in: `redirect(307, url, { external: true })` or
  an origin allowlist.
- **`json()` / `text()` deprecated** → `Response.json()` / `new Response(text)`;
  `defineParams` → `@sveltejs/kit/params`; hook/env types → `@sveltejs/kit/hooks`
  / `@sveltejs/kit/env`.
- **Security:** `csrf.checkOrigin` → `csrf.trustedOrigins` (CSRF always on);
  dev CORS on static assets is delegated to Vite (`server.cors.origin` if you
  rely on it).
- **Errors:** all errors, including `error(...)`, are piped through `handleError`;
  sourcemaps are applied to stack traces.
- `data-sveltekit-*="off"` → `false`; `updated.current` is now maintained
  passively (navigation, remote calls, visibility, hourly polling).
