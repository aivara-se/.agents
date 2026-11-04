# Shipping a PWA

## What makes it installable

The browser decides, not the manifest file. Chromium requires HTTPS (localhost counts), a manifest linked from every page with `name` or `short_name`, `start_url`, `scope`, a `display` of `standalone`, `minimal-ui` or `fullscreen`, icons at 192px and 512px (one `maskable`), and a registered service worker with a `fetch` handler.

Check the served build over CDP, not the source:

- `Page.getAppManifest` returns `errors: []`; parse `data` to confirm what the browser read.
- `Page.getInstallabilityErrors` returns an empty list.
- `Network.emulateNetworkConditions { offline: true }`, `Page.reload`, poll for the app's own node, and assert `performance.getEntriesByType('navigation')[0].transferSize === 0`.

Never a fixed sleep after the reload: a `controllerchange` reload can be in flight, so the read finds an empty body that is not a failure.

## A manifest that serves a root and a subpath

`start_url`, `scope` and every icon `src` resolve against the manifest URL. Use `"./"` and `"icons/icon-192.png"`; one build then installs at a domain root and at `/<repository>/`. Link it with `%sveltekit.assets%/manifest.json`, which SvelteKit emits as a per-page relative href (`./manifest.json`, `../manifest.json`).

iOS ignores part of the manifest: ship a 180px `apple-touch-icon` with no transparency, and `apple-mobile-web-app-title`, `-capable` and `-status-bar-style`. Also include the standard `mobile-web-app-capable`, or Chrome logs that the Apple meta is deprecated. `theme_color` cannot follow `prefers-color-scheme`; a matching `<meta name="theme-color" media="...">` pair covers the tab and the installed status bar where the browser reads it.

## SvelteKit 3

`src/service-worker.js` is built and registered automatically; `serviceWorker.register` defaults to true. The SvelteKit 3 API differs from the documented SvelteKit 2 one:

- `$app/manifest` exports `immutable`, `assets`, `prerendered` and `routes`, each item `{ path }` relative to the base.
- `$app/env` exports `version`, the build id also written to `_app/version.json`, which is a fresh `Date.now()` per build.
- The old `$service-worker` module and its `build`/`files`/`prerendered`/`version` exports are gone. Read `node_modules/@sveltejs/kit/src/types/ambient.d.ts` when a framework global is in doubt.

The framework's list is a Vite-manifest view, not the build's files: assets a library loads at run time (a wasm module, its proxy script) are absent. Derive the list from the output directory instead.

## Precache list from the build

Run a script after the adapter has written the site: `"build": "vite build && bun run scripts/precache.ts"`.

- Walk the output directory and skip dot entries, `service-worker.js`, `precache.json` and every `version.json`. A cached version file hides the next build; the worker and the list are read fresh.
- Map `index.html` to its directory path, `/` or `/search/`. A navigation asks for the directory, not `index.html`.
- Write root-relative URLs to `precache.json`. The worker fetches it at install with `cache: "reload"`, opens `app-${version}`, and calls `cache.addAll(files.map((path) => `${base}${path}`))`.
- `base` is `new URL(".", self.location).pathname` without the trailing slash: empty at a domain root, `/repository` under a project page.

If the list cannot be fetched or one file 404s, let the install fail. The worker already active keeps serving its own complete cache.

## Lifecycle and freshness

- `install`: precache, then `skipWaiting()`. `activate`: delete every `app-` cache except the current name, then `clients.claim()`.
- Fetch: navigation cache-first, matching after a trailing slash is appended and with `ignoreSearch`; other same-origin GETs cache-first; the network only on a miss. The app is complete on the device, and a launch must not wait for a request.
- `skipWaiting` plus deleting the old cache strands a running page whose lazy route chunks were hashed for the old build. The page reloads on `controllerchange`, guarded by `navigator.serviceWorker.controller` at mount: it is `null` on the first install, so the first visit does not reload.

A release reaches an installed app on its first launch after deploy. A CDN that caches the worker script for ten minutes can delay that launch.

## A single-writer browser store

SQLite in OPFS over a sync-access-handle pool allows one connection per origin. A second live document throws `createSyncAccessHandle ... another open Access Handle`. In the product this is one installed instance; in a test it appears when a target is left open, or when `Page.navigate` changes route and the old document stays in bfcache.

- Test a route change by clicking the app's own link, so the router handles it in one document.
- Close stale targets before calling a store failure real.
- Retry the pool install a few times before reporting the failure: a relaunch can beat the old worker's teardown.

## Send the operator a phone URL

A static host often has no per-PR preview. Serve the built directory and open a quick tunnel (`references/quick-tunnel-preview.md`): it is HTTPS, so the PWA installs on a real phone. Say that the tunnel is temporary, and name the production URL that will carry the change.
