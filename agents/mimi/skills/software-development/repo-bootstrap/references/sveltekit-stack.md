# SvelteKit 3 as a server app

The organisation's other SvelteKit repositories are static (`adapter-static`). A studio that writes to SQLite is a server, and SvelteKit 3 differs from 2 in ways that each cost a build cycle.

## Scaffold

- No `svelte.config.js`. Kit 3 reads its options from the `sveltekit()` Vite plugin: `sveltekit({ adapter: adapter({ out: "build" }) })`. `bunx svelte-kit sync` reads that Vite config.
- `adapter-node` must match the kit major: `^6` for kit 3. `5.x` logs `adapter_config_kit_deprecated` and treats `@sveltejs/kit/node/polyfills` as external, so the built server starts without its polyfills.
- `$lib` is aliased by the plugin at runtime but is not written into the generated tsconfig `paths`. Declare it twice — `resolve.alias: { $lib: fileURLToPath(new URL("./src/lib", import.meta.url)) }` in Vite, and `"paths": { "$lib": ["./src/lib"], "$lib/*": ["./src/lib/*"] }` in tsconfig. `config.alias` on the plugin is deprecated.
- tsconfig: `"extends": "$app/tsconfig"`, `"types": ["$app/types", "bun"]`, and `include` must cover `src/**/*.svelte` and `vite.config.ts`.

## Scripts, and why they force Bun

`bun:sqlite` is a `bun:` URL. Node's ESM loader rejects it (`ERR_UNSUPPORTED_ESM_URL_SCHEME`), and `bun run build` runs the `vite` binary through its `#!/usr/bin/env node` shebang. Force the runtime in every script that loads the server code:

```json
"dev": "bunx --bun vite dev",
"build": "bunx --bun vite build",
"start": "bun ./build/index.js"
```

A bare `bunx vite build` builds the client, then dies while analysing routes.

## Form actions

- A browser form post (`Accept: text/html`) answers `303` with `Location`. A fetch or curl with the default `Accept: */*` gets `200` and `{"type":"redirect","status":303,"location":"..."}`. A script that drives the app must send `accept: text/html` and `redirect: "manual"`.
- `fetch(url, {method: "POST"})` with no `body` is a GET and renders the page instead of running the action. Pass an empty object as the form body.
- Unchecked checkboxes are absent from `FormData`. Gate a full-field form on a field that is always present (`name`) and patch only the keys present for a bare post; otherwise an approve-only post blanks the description, and an unchecked box can never unapprove.
- `csrf.checkOrigin` is removed. Use `csrf: { trustedOrigins: ["*"] }` for a no-auth local studio, or list origins. adapter-node derives `https` unless `ORIGIN`, `PROTOCOL_HEADER` or `HOST_HEADER` is set, so a plain `http://127.0.0.1` run answers 403 "Cross-site POST form submissions are forbidden".

## SQLite

- `new Database(file, { create: true })`, then `PRAGMA journal_mode = WAL` and `PRAGMA foreign_keys = ON`; keep the schema as `CREATE TABLE IF NOT EXISTS` executed at import.
- Resolve the data directory from an env var with `process.cwd()` as the default, and set it explicitly when a wrapper launches the process. Two working directories give one database with image rows and an empty image folder.
- Return derived paths from SQL (`SELECT *, '/media/' || path AS href`) instead of assembling them in the route, so the row type stays one shape.

## Schema changes

- `CREATE TABLE IF NOT EXISTS` never adds a column to a table that already exists. Version the schema with `PRAGMA user_version`: read it at import, run the `ALTER TABLE` statements for the next version, then set the new number.
- Guard each `ALTER` with a `PRAGMA table_info(<table>)` check, so a fresh file and a migrated file take the same path.
- Migrate before any statement that names the new column. A boot-time `UPDATE … WHERE status = 'running'` placed above the `ALTER` kills the server on an old file before it listens.
- A destructive step belongs behind the same version number — dropping a table a previous version wrote is one `DROP TABLE IF EXISTS` inside the `version < n` branch, not a manual note in the README.

## Types worth knowing

- `noUncheckedIndexedAccess` makes every index access `T | undefined`, and `filter(Boolean)` does not narrow it. Write `filter((v): v is T => Boolean(v))`.
- A route's props need their generated types named: `let { data, form }: { data: PageData; form: ActionData } = $props();`.

## A job longer than a request

A model call over a whole novel runs for minutes, and a tunnel or proxy drops the request at about 100 s. Do not hold the form action open.

- The action writes a status on the row (`running`, a part count), starts the work with `void (async () => { … })(),` and redirects.
- The work reports progress by writing the row; the page renders that row and carries `<meta http-equiv="refresh" content="3">` while the status is `running`.
- The catch writes `error` and its message onto the row, so the failure survives the redirect.
- On boot, mark any row still `running` as failed: the process that owned it is gone.

## Restarting the demo cleanly

- `ss -ltnp | grep :PORT` finds the process that owns the port. Kill that pid, not the wrapper: a backgrounded `bash -c` start leaves a child that keeps answering after the parent exits, and the next start fails to bind while the old build serves.
- Never delete the data directory while a server holds the database. SQLite keeps writing to the unlinked file, so the running app looks full and a fresh `ls` looks empty.

## Tests

`bun test` cannot resolve `$app/*`. Keep the pure modules (analysis, planning, prompts) free of kit imports and test those; keep route logic thin enough to read.

## Verification

`bun run check` runs sync, `svelte-check`, `bun test` and the production build. The build step is the one that catches a runtime-only import such as `bun:sqlite`.
