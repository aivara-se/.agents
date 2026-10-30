# SvelteKit on Cloudflare Pages

## `_redirects` lives at the project root

- `@sveltejs/adapter-cloudflare` requires `_redirects` at the repository **root**. Sitting in `static/` it fails the build: `The _redirects file should be placed in the project root rather than the <repo>/static directory`. The adapter copies it into the output itself — do not also copy it by hand.
- Comments are `#` lines. A `/* ... */` block is parsed as rules, not as a comment; the emulator's `Parsed N valid redirect rules` line is the check on what it understood.
- Redirect file over a global `trailingSlash` setting when only some paths need it: `trailingSlash: 'always'` rewrites every canonical URL and every existing link.

## Prerendered output, and why a trailing slash 404s

- `export const prerender = true` (in `+page.ts`, or `+layout.ts` for the whole tree) emits each route as `<route>.html`: `/mimi` becomes `mimi.html`.
- The host serves `/mimi` from that file. `/mimi/` looks for a directory index, finds none, falls through to the worker and 404s — so a page whose address is habitually written with a slash needs `/mimi/ /mimi 308`.
- `_routes.json` lists the paths kept out of the worker (prerendered pages, static assets); anything unlisted goes through SSR. It is regenerated at build time — never hand-edit it.
- A route directory, the route table and the content table have to agree about which pages exist. Nothing in a SvelteKit repo checks that: add a test that reads the filesystem and compares it with the tables, because a missing route directory is a 404 in production and a green build locally.

## Local emulation

```bash
bun run build
bunx wrangler pages dev .svelte-kit/cloudflare --port 8788 --ip 127.0.0.1
```

- Run it in the background, wait for `Ready on`, then curl. It prints the parsed redirect and header rules on startup.
- **Rebuild before serving after any change**: the emulator serves the built output, so a token or CSS edit is invisible until you rebuild.
- The type checker cannot see SSR, routing, headers or host config — only the worker can. A clean `svelte-check` means the components compile and nothing more.

## The preview deployment is the real evidence

A Pages project wired to the repository deploys every PR; the PR comment carries a commit URL and a branch URL. Curl those — they are the host's own build of your commit — and put the results in the PR body. Runtime flags such as `nodejs_als` (needed by SvelteKit's server code) live in the dashboard, not the repository: if SSR fails only in the preview, look there first.

## Fonts and third-party origins

- Self-host the fonts, keep the licences beside them, and prove the CDN link is gone on every route and in the bundle:

```bash
curl -s <url> | grep -c 'fonts.googleapis\|fonts.gstatic'          # 0
curl -s <url>/_app/immutable/assets/<hash>.css | grep -c 'gstatic' # 0
```

- Bundled CSS resolves font URLs relative to the asset directory (`../../../fonts/...`), so the files have to sit where three levels up lands.

## One layout per entity subtree

- Chrome a page family shares — a per-instance accent, its wash, its header, its link rules — belongs in `<entity>/+layout.svelte` with a `<entity>/+layout.ts`, not inside the page component. The layout renders on every page under that subtree, so a second page costs one file and the chrome stays written once.
- Resolve the entity **once**, in the layout's `load`, and let the pages read the parent data (`data.entity`): the same literal in two files is a name that can be typo'd into rendering the wrong instance. A test that reads the layout file and asserts its literal matches its directory makes it mechanical.
- `prerender` in the subtree's `+layout.ts` covers every page under it. Declare it consistently with the repository's other routes rather than mixing page-level and layout-level.
- Guard the shape with a test over the filesystem: the route directories, the entity table and the dictionary must agree, and a page must not render another page's component.

## Page-wide rules across components

- Svelte scopes every selector, so a rule that has to reach links in the layout, in the page and in a nested component is written once at the page root: `.page :global(a)`.
- Write an exception with the element inside the `:global()` — `:global(a.portrait) { border-bottom: none }`. A scoped `.portrait` in the child ties with the page's global rule on specificity and then depends on stylesheet order, which is invisible in the source.

