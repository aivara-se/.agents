# SvelteKit on Cloudflare Pages

## `_redirects` lives at the project root

`@sveltejs/adapter-cloudflare` needs it at the **root**; in `static/` the build fails with `The _redirects file should be placed in the project root rather than the <repo>/static directory`. The adapter copies it into the output, so do not copy it by hand.

Comments are `#` lines; `/* ... */` is parsed as rules. The emulator's `Parsed N valid redirect rules` line checks what it understood. Use a redirect when only some paths need a slash: `trailingSlash: 'always'` rewrites every link.

## Prerendered output, and why a trailing slash 404s

`export const prerender = true` in `+page.ts`, or `+layout.ts` for a whole tree, emits `<route>.html`: `/mimi` becomes `mimi.html`. `/mimi/` finds no directory index, falls through to the worker and 404s, so add `/mimi/ /mimi 308`.

`_routes.json` lists what the worker skips and is regenerated at build time — never hand-edit it.

Route directory, route table and content table must agree, and nothing checks that. Add a test that reads the filesystem: a missing directory is a 404 in production and a green build locally.

## Local emulation

```bash
bun run build
bunx wrangler pages dev .svelte-kit/cloudflare --port 8788 --ip 127.0.0.1
```

Background it, wait for `Ready on`, then curl; it prints the parsed redirect and header rules. **Rebuild before serving after any change** — the emulator serves the built output. The type checker cannot see SSR, routing, headers or host config: a clean `svelte-check` means the components compile.

## The preview deployment is the real evidence

Every PR comment carries a commit URL and a branch URL: curl those, they are the host's build of your commit. `nodejs_als` (SvelteKit's server code needs it) lives in the dashboard — if SSR fails only in the preview, look there.

## Fonts and third-party origins

Self-host the fonts, keep the licences beside them, and prove the CDN is gone:

```bash
curl -s <url> | grep -c 'fonts.googleapis\|fonts.gstatic'          # 0
curl -s <url>/_app/immutable/assets/<hash>.css | grep -c 'gstatic' # 0
```

Bundled CSS resolves font URLs from the asset directory (`../../../fonts/...`), so the files sit three levels up.

## One layout per entity subtree

Chrome a page family shares — accent, wash, header, link rules — goes in `<entity>/+layout.svelte` with a `<entity>/+layout.ts`; a second page then costs one file. Resolve the entity **once** in the layout's `load` and let pages read `data.entity`: the same literal in two files can be typo'd into the wrong instance, and a test comparing the literal with the directory makes it mechanical.

`prerender` in the subtree's `+layout.ts` covers every page under it; do not mix page-level and layout-level declarations. Extend the filesystem test to the entity table and the dictionary, and assert that no page renders another's component.

## Page-wide rules across components

Svelte scopes every selector, so a rule that must reach links across the layout, the page and a nested component is written once at the page root: `.page :global(a)`. Put the element inside the `:global()` for an exception — `:global(a.portrait) { border-bottom: none }` — because a scoped `.portrait` ties with the page rule and then depends on stylesheet order.
