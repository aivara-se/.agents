---
name: sveltekit
description: Use when building or changing a SvelteKit 3 app.
author: MeMe
license: MIT
when-to-use: A new SvelteKit app, a page or component in one, a conversion from a no-build browser app, or a build that fails, type-checks wrongly or serves a blank page. SvelteKit 3's configuration and module names differ from every 2.x tutorial.
metadata:
  hermes:
    tags:
      [sveltekit, svelte, vite, spa, service-worker, static-site, github-pages]
    category: software-development
    related_skills: [static-web-app, testing, coding]
---

# SvelteKit 3

## When to use

- A new app, or a conversion from a no-build browser app.
- One client-only page that also works offline, served from static files.
- A build that fails, type-checks wrongly, or serves a blank page.
- A page edit where the gate is green and the render is the thing to check.
- Icons: `references/icons.md`. A roster entry such as aivara.se: read `references/roster-pages.md` first — the source shows five of the six places, and the tests name the sixth. Data from outside the repo: `references/remote-data.md`.
- A 2.x tutorial: read below first.

The installed package is the authority, not a tutorial: `node_modules/@sveltejs/kit/types/index.d.ts` (the `declare module '$app/...'` blocks give every module's exports) and `node_modules/@sveltejs/kit/src/core/config/options.js` (every option and default).

## What changed from 2.x

- **`svelte.config.js` is gone.** Configuration moves to the Vite plugin in `vite.config.ts`, and `config.kit.*` becomes a top-level plugin option:

```ts
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter({
        pages: "build",
        assets: "build",
        fallback: "404.html",
      }),
    }),
  ],
});
```

- **`$lib` is gone.** Declare `"imports": { "#lib/*": "./src/lib/*" }` in `package.json` and import `#lib/words.js` with the extension.
- **`$app/environment` is now `$app/env`** (`browser`, `dev`, `building`, `version`).
- **`$service-worker` is gone.** A service worker imports `$app/manifest` (`immutable`, `assets`, `prerendered`, `routes`), `$app/service-worker` (`self` typed `ServiceWorkerGlobalScope`) and `$app/env` (`version`). SvelteKit bundles and registers it — do not register it yourself.
- **`asset()`/`resolve()` are typed to files and routes the build knows**, so a runtime path needs a cast: `asset(path as AssetPath)`. `base` and `assets` export alongside them.
- Minimums: Node 22.17, TypeScript 6, Svelte 5.57.1, Vite 8, `@sveltejs/vite-plugin-svelte` 7.

## A client-only single page app

- Root `+layout.ts`: `export const ssr = false;` and `export const prerender = true;`. Prerendering with `ssr` off writes a shell — what a client-only app wants.
- `adapter-static` with `fallback` writes that shell twice: `index.html` and the fallback. On GitHub Pages the fallback must be `404.html`, the only name Pages answers an unknown path with.
- **The fallback alone does not make a one-page app.** The client router resolves the URL, so an unknown path renders SvelteKit's own 404 inside the shell. Add `src/routes/[...rest]/+page.ts` with `export const prerender = false;` and a `+page.svelte` rendering the same screen from a component both routes import. A rest route cannot be prerendered, hence the opt-out.
- **`paths.base` is the path the host serves the artifact under, and getting it wrong is silent.** Both shells carry `base` in their bootstrap, and `asset()` resolves through it for every run-time fetch. Set it from an env var **only when the site really is served under a path**: a Pages site with its own domain (`gh api repos/<owner>/<repo>/pages` → `cname`, `html_url`) is served at the root of that domain, and the project path 301s to it. A base there sends every fetch to `/<base>/...`, where nothing answers — and the shell's relative URLs still boot and look right, so the app opens with an empty word list and no error in the DOM.
- Keep the seed data (`static/lists/*.json`) as files fetched at run time, not inlined imports, when precache and IndexedDB seeding depend on them being files.

## Type checking

- `svelte-kit sync` writes `node_modules/$app/tsconfig.json`; the project's `tsconfig.json` extends `$app/tsconfig`, which sets `checkJs`, `verbatimModuleSyntax` and `isolatedModules` — overwriting either of the last two fails the build's warning check.
- `types` must still include `$app/types`; `"types": ["$app/types", "bun"]` is fine, and a `bun:test` import needs it.
- **The service worker needs its own tsconfig or nothing checks it.** Give it `src/service-worker/tsconfig.json` extending `$app/tsconfig/service-worker` (WebWorker lib) and run a second `tsc --noEmit -p` pass.
- `svelte-check` is the only checker that sees `.svelte`; `tsc` alone reports zero errors on a file that does not compile.

## Verifying a change

- **A build that boots is not a build that works.** A wrong `base` gives a screen with no data, no naming console error, and a green gate. Fetch what the app asks for at run time: `curl -o /dev/null -w '%{http_code}' https://<domain>/lists/index.json`.
- **The gate does not look at the page.** `check`, `format:check`, `test` and `build` pass on a tree that draws the wrong order or keeps a link that had to go. Serve the built tree and read the DOM: order and position by `getBoundingClientRect()`, absence by querying for it.
- **A data-driven section is changed in the data, and a test usually pins its shape.** A curated-content test hardcodes the count and key order (`toHaveLength(n)`, the slug array), so the data edit leaves the suite red while the build stays green — grep the test tree for the entry's key first. Then grep the built HTML for the string that had to go (empty is the pass) and check the rows and any derived count move with it.
- **The output directory is the adapter's.** Read `vite.config.ts` for what the build writes and the deploy workflow for where it goes; the deployment docs may still name the host it left.
- **Every asset reference is relative to its page's depth.** `./_app/...` at the root, `../_app/...` from `/mimi/`. A check that pulls a `/_app/...` URL out of a nested page 404s through no fault of the app — resolve each against the page's own directory. It also lets one build serve from a domain root or a project path.
- **A green deploy is not a live site.** Check the address a reader uses (`curl -sSI https://<domain>/`), not the run's conclusion: a Pages site with no custom domain serves `<owner>.github.io/<repo>/` (`cname: null`) while the domain answers _Site not found_ with a 404 from GitHub's edge.
- **A gate run in a fresh worktree needs its own `node_modules`.** A symlink to the clone's copy makes `svelte-check` report `Cannot find module './$types.js'` at a commit that is green in the clone; `cp -a` the directory instead.
- **When a section loses its only heading, move the accessible name with it.** A `<section aria-labelledby="…">` whose `<h2>` is gone names nothing: put `aria-label` on the section, fed by the same dictionary string.

- **A page whose state lives in a worker can be seeded from the dev server.** `vite dev` serves source module URLs, so an evaluate can import the page's own client and write a past day before a reload: `await import('/src/lib/client.js')`, then `call('saveDay', { day, body, seq: 1e6 })`. Use a high seq — a tombstone keeps its counter, and a low one is refused. The build's hashed chunks cannot be imported this way: use the dev server when the data must be arranged, the built tree when only the drawing is checked.

## Sharing a preview for the operator's review

A design change is reviewed by using the running app, not by reading a diff.

1. Build the branch, then serve `build/` with `scripts/serve-build.ts` (Bun). `vite preview` is not enough — see the pitfalls. The server must resolve every extensionless path to its own `index.html`, so `/`, `/agent/` and `/agent/log/` all answer, and map the content types the build emits. `python3 -m http.server` 404s the extensionless form the links use.
2. Start a quick tunnel and read the URL from its log: `cloudflared tunnel --url http://localhost:8788 > tunnel.log 2>&1` in the background, then poll `grep -m1 -oE 'https://[a-z0-9-]+\.trycloudflare\.com' tunnel.log`. It lives while that process does: kill `cloudflared` afterwards and prove the close.
3. Prove the URL end to end first — a sandbox resolver often cannot resolve `*.trycloudflare.com` while public DNS can. Use DoH: `curl -sS 'https://1.1.1.1/dns-query?name=<host>&type=A' -H 'accept: application/dns-json'` needs no name server; read the A record, then `curl -sS --resolve "<host>:443:<ip>" https://<host>/`. A 200 through the edge is the proof; `Could not resolve host` is not.
4. **When the point under discussion is a detail, send the detail.** A 16px icon or a hairline border is invisible in a full-page screenshot: crop the element and upscale it.
5. **An attachment with no words is the specification.** Read it as the target geometry, reproduce it, and prove the match by rendered-pixel comparison (see `testing` → `references/browser-checks.md`).

## Pitfalls

- **Template whitespace is DOM.** Under `white-space: pre-wrap`, a newline between a block and an element becomes a visible character. Write the runs on one line and assert `container.textContent` exactly.
- **`$effect` runs after the DOM update** and re-runs only on the signals it reads. Read the value the DOM was built from, not its input: an effect reading raw text missed a change to the words behind the marks, and the fade and bottom anchor went stale.
- **A panel closed from a document `click` listener never opens.** Svelte flushes the state change and its `$effect` while the opening click still bubbles, so the listener is live for that same click and closes the panel at once. Close on `pointerdown` instead — the press that opened it is already past — and return early for the toggle control's own subtree, or its click turns the closed state back into an open one.
- **`vite preview` reads the build directory once.** Rebuild while it runs and new hashed files 404 — `Failed to fetch dynamically imported module`. Restart it after every build. It also answers a foreign `Host` header with 403, so a tunnel needs a plain static server over `build/`.
- **`adapter-static` + a prerendered `/` + a rest route**: `prerender = false` on the rest route only; `true` makes the build enumerate infinite paths.
- **A wall of `href="./..."` in `index.html` is normal; the absolute paths are in the fallback (`404.html`).** Read the `base` in that fallback's bootstrap: it tells whether the app's files will load, and the page looks right either way.
- **The dev server does not build the service worker**, so offline behaviour needs a build.
- **Kill a server by PID, and kill its child.** `pkill -f "vite preview"` matches the shell running the kill — your own `bash -c` — so it SIGTERMs the session (exit 143) first. Kill the PID the background handle gave you, its children with it, then re-read `ps`.
- **Helpers defined outside a `page.evaluate` are undefined inside it.** The callback is serialised into the page, so no closure crosses. Measure numerically instead (`scripts/measure-render.mjs`); a script dying with `x is not defined` needs every helper moved inside the callback.
- **A file rewritten in several patches can end half new** — markup renamed while the old `<style>` names the old selectors, or an import pointing at a deleted component. `svelte-check` catches both (`Unused CSS selector`, `Cannot find module`): run `check` after each batch.
- **A snippet is styled by the component that defines it, not the one that calls it.** `{#snippet}` content compiles in the parent holding it, so that component's scoped `<style>` reaches it and the consumer's does not — inject an icon as a snippet, leave the consumer's markup plain, skip `:global`.
- **Two copies of one UI element drift apart, and measuring them into agreement is not the fix.** Give it one component and let each route supply only what differs (the trail, the glyph), then compare rendered boxes. For a whole page, the proof is a diff of the existing route's built HTML: only hashed asset names and scoped class ids may change.
- **An SVG path with no `fill` of its own renders black.** `fill: currentColor` on the icon's rule keeps it in its link's colour; drop it and the path fills black while every other colour still looks right. Read a pixel of the rendered icon.
- **`getBBox()` ignores the element's own transform**, returning geometry in its user space, so a `scale()` reads as though it never applied. Use `getBoundingClientRect()`.
- **What the operator has signed off is a lock.** After a refactor beside it, measure that element's box and colour again and show they are unchanged; an unasked change is a defect even when it looks better.
- **The hand-written `bun:test` shim is the only matcher surface `svelte-check` sees.** `bun test` accepts a matcher the shim omits (`toMatch`), but `check` fails with `Property 'toMatch' does not exist`; declare it in `src/bun-test.d.ts`.
- **A row rendered by `{#if selected}` disappears at the mousedown that blurs the note.** The blur handler clears the selection, Svelte removes the button before the mouseup, and no click lands — the same failure as a `pointer-events: none` fade. Render the row whenever the entry is not being edited, reveal it on `:focus-within`/`.selected`, and let a delayed `visibility` carry both the fade and the hit test.
- **A row hung inside a clipped box is invisible and takes no press.** Put the clip and the ellipsis on the text node, then prove the row with `elementsFromPoint` and a real press: `el.click()` passes through the clip.
