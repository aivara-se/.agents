# SvelteKit on Cloudflare Pages: notes that cost time

## `_redirects` lives at the project root, not in `static/`

`@sveltejs/adapter-cloudflare` refuses a copy under `static/` and fails the build with "The \_redirects
file should be placed in the project root". Put it at the repository root; the adapter copies it into the
output. Comments use `#` — a `/* ... */` block is parsed as a rule.

## A prerendered page is `<name>.html`, so the trailing-slash URL 404s

With the default `trailingSlash: 'never'`, `/about` prerenders to `about.html`. A request for `/about/` is
not that file, and it falls through to the worker, which has no such route: 404. If the addresses being
replaced were written with a trailing slash, add a rule per path rather than switching the whole site to
`trailingSlash: 'always'` — one redirect beats changing every URL and canonical on the site.

```
# The old addresses were written with a trailing slash (old.example/ -> new.example/about/)
/about/ /about 308
```

Verify after a build: the adapter prints `Parsed N valid redirect rules` when the local worker starts.

## `_routes.json` decides what the worker even sees

Prerendered pages and files in `static/` are excluded from the worker; everything else goes to it, so a
probe HTML file dropped in the build directory is not served unless it is in that list. Do not edit the
generated list to test — measure the page itself, or serve the probe from wherever it is listable.

## One id literal per route subtree

A per-route `+layout.ts` that returns data lets the layout and every page under it read `data` (a page
with no `load` inherits the parent's data), so an identifier like a slug or a bot id is written once, in
the layout, instead of in each file where a typo renders the wrong record. A test that reads the route
directories and asserts the layout's literal matches the directory name is cheap and catches the drift.

Prerender is declared once for the whole site by the root `+layout.ts`; a nested layout that adds
`export const prerender = true` again is redundant but harmless. What matters is checking the emitted
output, below.

## Check what the build emitted, not what the config says

```bash
bun run build
ls .svelte-kit/cloudflare/*.html .svelte-kit/cloudflare/*/*.html
```

A page missing from that listing is a page that will 404 in production, whatever the route file says.

## The deployed preview is the artifact under review

Cloudflare Pages posts the deploy status and a preview URL (a per-commit host and a per-branch host) on
the pull request. Measure that URL, not only `localhost`: the host's redirect table, its asset routing and
the adapter's output are what run in production, and they are the parts a local preview server does not
reproduce.
