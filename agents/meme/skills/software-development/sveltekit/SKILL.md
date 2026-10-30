---
name: sveltekit
description: Use when building or changing a SvelteKit 3 app.
version: 1.3.0
author: MeMe
license: MIT
when-to-use: Building or changing a SvelteKit app — a new one, a page or a component in an existing one, a conversion from a no-build browser app, or a build that fails, type-checks wrongly or serves a blank page. Especially SvelteKit 3, whose configuration and module names differ from every 2.x tutorial.
metadata:
  hermes:
    tags: [sveltekit, svelte, vite, spa, service-worker, static-site, github-pages]
    category: software-development
    related_skills: [static-web-app, testing, coding]
---

# SvelteKit 3

## When to Use

- Starting a SvelteKit app, or converting a no-build browser app to one.
- Making one client-only page that also works offline, served from static files.
- A SvelteKit build that fails, type-checks wrongly, or serves a blank page.
- Changing a page in an existing SvelteKit site — a section's order, a link that has to go, a string — where the gate is green and the render is the thing to check.
- Changing or adding a drawing or the icon set: sourcing official artwork, vendoring it, cutting a silhouette out of a tile, reconstructing a mark as SVG, the favicon and maskable set — see `references/icons.md`.
- Anything a 2.x tutorial describes: check what changed below first.

The installed package is the authority, not a tutorial: read `node_modules/@sveltejs/kit/types/index.d.ts` (the `declare module '$app/...'` blocks give every module's real exports) and `node_modules/@sveltejs/kit/src/core/config/options.js` (every option and its default).

## What changed from 2.x

- **`svelte.config.js` is gone.** Configuration goes to the Vite plugin in `vite.config.ts`, and what was `config.kit.*` is now a top-level plugin option:

```ts
import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit({
    adapter: adapter({ pages: "build", assets: "build", fallback: "404.html" }),
  })],
});
```

- **`$lib` is gone.** Declare subpath imports in `package.json` — `"imports": { "#lib/*": "./src/lib/*" }` — and import `#lib/words.js` with the extension.
- **`$app/environment` is now `$app/env`** (`browser`, `dev`, `building`, `version`).
- **`$service-worker` is gone.** A service worker imports `$app/manifest` (`immutable`, `assets`, `prerendered`, `routes`), `$app/service-worker` (`self` typed as `ServiceWorkerGlobalScope`) and `$app/env` (`version`). SvelteKit bundles it and registers it — do not register it yourself.
- **`asset()`/`resolve()` are typed to the files and routes the build knows**, so a path built from runtime data needs a cast: `asset(path as AssetPath)`. `base` and `assets` are exported alongside them.
- Minimums: Node 22.17, TypeScript 6, Svelte 5.57.1, Vite 8, `@sveltejs/vite-plugin-svelte` 7.

## A client-only single page app

- Root `+layout.ts`: `export const ssr = false;` and `export const prerender = true;`. Prerendering with `ssr` off writes a shell, which is exactly what a client-only app wants.
- `adapter-static` with `fallback` writes that shell twice: `index.html`, and the fallback. On GitHub Pages the fallback must be named `404.html` — that is the only name Pages answers an unknown path with.
- **The fallback alone does not make a one-page app.** The client router resolves the URL, so an unknown path renders SvelteKit's own 404 page inside the shell. Add `src/routes/[...rest]/+page.ts` with `export const prerender = false;` and a `+page.svelte` rendering the same screen — put the screen in a component both routes import — and the app opens at any address it is bookmarked under. A rest route cannot be prerendered, which is why it is opt-out.
- **`paths.base` is the path the host serves the artifact under, and getting it wrong is silent.** Both shells carry `base` in their bootstrap, and `asset()` — the call for every file the app fetches at run time, a word list or a letter clip — resolves through it. Set it from an env var **only when the site really is served under a path**, and check which it is: a Pages site with its own domain (`gh api repos/<owner>/<repo>/pages` → `cname`, `html_url`) is served at the root of that domain, and the project path 301s to it. A base there sends every one of those fetches to `/<base>/...`, where nothing answers. The shell's own URLs are relative, so the page still boots and looks right while its data is missing — an app that opens with an empty word list and no error in the DOM.
- Keep the seed data (`static/lists/*.json`) as files fetched at run time rather than inlined imports when the app's own precache and IndexedDB seeding depend on them being files.

## Type checking

- `svelte-kit sync` writes `node_modules/$app/tsconfig.json`; the project's `tsconfig.json` extends `$app/tsconfig`. That parent sets `checkJs`, `verbatimModuleSyntax` and `isolatedModules` — overwriting `verbatimModuleSyntax` or `isolatedModules` fails the build's own warning check.
- `types` must still include `$app/types`; adding the runtime's is fine: `"types": ["$app/types", "bun"]`. A `bun:test` import needs it.
- **The service worker needs its own tsconfig or nothing checks it.** SvelteKit excludes it from the app's config; give it `src/service-worker/tsconfig.json` extending `$app/tsconfig/service-worker` (WebWorker lib) and run a second `tsc --noEmit -p` pass over it.
- `svelte-check` is the only checker that sees `.svelte`; `tsc` alone reports zero errors on a file that does not compile.

## Verifying a change to a prerendered app

- **A build that boots is not a build that works.** The shell loads on relative paths, so a wrong `base` yields a screen with no data, no console error that names it, and a green gate. Fetch the addresses the app asks for at run time against the served artifact, not just the page: `curl -o /dev/null -w '%{http_code}' https://<domain>/lists/index.json`, and confirm the app's own script names match (`asset("lists/index.json")`).
- **The gate does not look at the page.** `check`, `format:check`, `test` and `build` all pass on a tree that draws the wrong order, or still carries a link that had to go. Serve the built tree and read the DOM — order and position by `getBoundingClientRect()`, an absence by querying for it — and read the built HTML for whatever the first paint carries.
- **A data-driven section is changed in the data, and its shape is usually pinned by a test.** A row that has to go comes out of its data file, and the same change must update every test that asserts the list's shape — a curated-content test commonly hardcodes the count and the exact key order (`toHaveLength(n)`, the slug array), so the data edit alone leaves the suite red while the build stays green. Grep the test tree for the entry's key before editing, not after. Then verify against the built output rather than the suite: grep the built HTML for the string that had to go (an empty result is the pass) and read the rendered rows and any derived count (a number backed by the list's `length`) — the removal and the count have to move together.
- **The output directory is the adapter's.** `adapter({ pages: "build", assets: "build" })` writes `build/`, and a repository that swapped adapters no longer produces the old host's directory. Read `vite.config.ts` for what the build writes and the deploy workflow for where it goes: the repository's own deployment docs may still name the host it left, which is a change of its own rather than part of yours.
- **Every asset reference is relative to its page's depth.** `./_app/...` at the root, `../_app/...` from `/mimi/`. That is correct everywhere a browser or a static host resolves it, so a check that pulls a `/_app/...` URL out of a nested page's HTML and fetches it 404s through no fault of the app — resolve each reference against the page's own directory. It is also what lets one build serve from a domain root or from a project path unchanged.
- **A green deploy is not a live site.** After a host switch, check the address a reader uses — `curl -sSI https://<domain>/` — not just the run's conclusion: a Pages site whose custom domain was never set serves its project path instead (`<owner>.github.io/<repo>/`, and the Pages API reports `cname: null`) while the real domain answers *Site not found* with a 404 from GitHub's own edge. The deploy is green because the artifact published; the site is unreachable where it is named.
- **When a section loses its only heading, move the accessible name with it.** A `<section aria-labelledby="…">` whose `<h2>` is deleted names nothing. Put `aria-label` on the section, fed by the same dictionary string the heading used, so the region is still announced and that string keeps one home.

## Sharing a preview for the operator's review

A design change is reviewed by using the running app, not by reading a diff. Serve the
built tree on this machine and give the operator a quick tunnel over it.

1. Build the branch, then serve `build/` with `scripts/serve-build.ts` (Bun). A plain
   static server is here because `vite preview` is not enough — see the pitfall below —
   and it must do what the host does: resolve every extensionless path to its own
   `index.html`, so `/`, `/agent/` and `/agent/log/` all answer, and map the content
   types the build emits. `python3 -m http.server` is not a substitute: it answers a
   directory URL but 404s the extensionless form the links actually use.
2. Start a quick tunnel into that server and read the URL from its own log:
   `cloudflared tunnel --url http://localhost:8788 > tunnel.log 2>&1` in the background,
   then poll `grep -m1 -oE 'https://[a-z0-9-]+\\.trycloudflare\\.com' tunnel.log` until it
   prints. The tunnel lives as long as that process does — say this, and close it only
   when the operator is done: kill the `cloudflared` process and prove the close.
3. Prove the URL end to end before sharing. A sandbox resolver often cannot resolve
   `*.trycloudflare.com` while public DNS can — a tunnel that is fine for the operator
   still looks dead from inside. Verify through DoH instead:
   `curl -sS 'https://1.1.1.1/dns-query?name=<host>&type=A' -H 'accept: application/dns-json'`
   reaches the resolver by IP, so it needs no name server; read the A record and
   `curl -sS --resolve "<host>:443:<ip>" https://<host>/`. A 200 through the edge with
   the expected content type is the proof; the `Could not resolve host` message is not.
4. **When the point under discussion is a detail, send the detail.** A 16px icon, a 2px
   gap and a hairline border are invisible in a full-page screenshot: crop the element
   out of the page and upscale it several times before attaching it, so the operator
   judges the exact thing being changed.
5. **An attachment with no words is the specification.** The operator sends the shape he
   wants, not a description of it — read it as the target geometry, reproduce it, and
   prove the match with a rendered-pixel comparison (see `testing` →
   `references/browser-checks.md`), not with an impression of what it looked like.

 ## Pitfalls

- **Template whitespace is DOM.** Where the app's text is significant (`white-space: pre-wrap`), a newline between a block and an element becomes a character the user sees. Write the runs on one line with no literal whitespace and assert `container.textContent` is exactly what was typed.
- **`$effect` runs after the DOM update** and re-runs only on the signals it reads. Read the value the DOM was built from, not just its input: an effect reading the raw text missed a change to the words behind the marks, so the fade and the bottom anchor went stale.
- **`vite preview` reads the build directory once.** Rebuild while it runs and the new hashed files 404 while the old ones still answer — the app boots to a blank page with `Failed to fetch dynamically imported module`. Restart the server after every build. It also answers a foreign `Host` header with 403, so a tunnel needs a plain static server over `build/` instead.
- **`adapter-static` + a prerendered `/` + a rest route**: set `prerender = false` on the rest route only; marking it `true` makes the build try to enumerate infinite paths.
- **A wall of `href="./..."` in `index.html` is normal; the absolute paths are in the fallback (`404.html`).** Read the `base` in that fallback's bootstrap for what the build was told it serves under: it is the whole story of whether the app's own files will load. The page looks right either way, so nothing else in the output says.
- **The dev server does not build the service worker**, so offline behaviour can only be checked against a build.
- **Kill a server by PID, and kill its child.** `pkill -f "vite preview"` matches the shell line that is running the kill — your own `bash -c` — so it SIGTERMs the session (exit 143) before the server dies, and killing a `bunx`/`npm` wrapper leaves the `node` process it spawned holding the port. Kill the PID the background handle gave you, kill its children with it, and re-read `ps` before rebinding.
- **Helpers defined outside a `page.evaluate` are undefined inside it.** The callback is serialised and runs in the page, so no closure crosses that boundary in either direction. Measure numerically instead — the rendered geometry, type sizes and colours of every key selector (see `scripts/measure-render.mjs`) — and when the script dies with `x is not defined`, move every helper the callback needs inside the callback before anything else.
- **A file rewritten in several patches can end half new** — markup renamed while the old `<style>` block still names the old selectors, or an import left pointing at a component you deleted. `svelte-check` catches both (`Unused CSS selector`, `Cannot find module`), so run `check` after each batch of rewrites instead of only on the final tree.
- **A snippet is styled by the component that defines it, not the one that calls it.** `{#snippet}` content compiles in the parent holding the `{#snippet}`, so that component's scoped `<style>` reaches it and the consumer's does not — inject an icon or a styled block as a snippet and leave the consumer's markup plain, rather than reaching for `:global` to style its own children.
- **Two copies of one UI element drift apart, and measuring them into agreement is not the fix.** Where routes must render an element identically — same word, colour, box, baseline — give it one component and let each route supply only what differs (the trail, the glyph), then compare rendered boxes as proof. The extraction is the change; the measurement is the check.
- **An SVG path with no `fill` of its own renders black.** The `fill: currentColor` on an icon's rule is what keeps the glyph in its link's colour; drop it while refactoring and the path silently fills with the default black while every other colour on the page still looks right. Keep the rule, then read a pixel of the rendered icon rather than trusting the CSS you remember writing.
- **`getBBox()` ignores the element's own transform** — it returns geometry in the element's own user space, so a `scale()` on that element reads as though it never applied, and numbers taken that way cannot prove a rendered size. Use `getBoundingClientRect()`.
- **What the operator has signed off is a lock.** After a later refactor beside it — an extraction, a merged style block — measure that element's box and colour again and show they are unchanged; a change nobody asked for is a defect even when it looks better.
