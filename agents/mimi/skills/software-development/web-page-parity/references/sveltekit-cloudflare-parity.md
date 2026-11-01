# SvelteKit on Cloudflare Pages: notes that cost time

## `_redirects` lives at the project root, not in `static/`

`@sveltejs/adapter-cloudflare` refuses a copy under `static/` and fails the build with "The \_redirects file should be placed in the project root". The adapter copies it into the output. Comments use `#`; a `/* ... */` block is parsed as a rule.

## A prerendered page is `<name>.html`, so the trailing-slash URL 404s

With `trailingSlash: 'never'`, `/about` prerenders to `about.html`, and `/about/` falls through to the worker and 404s. Add a rule per path rather than switching the site to `'always'` — one redirect beats changing every URL and canonical.

```
# The old addresses were written with a trailing slash (old.example/ -> new.example/about/)
/about/ /about 308
```

`_routes.json` excludes prerendered pages and `static/` from the worker and is regenerated at build time: do not edit it to serve a probe file. The adapter prints `Parsed N valid redirect rules` when the local worker starts.

## One id literal per route subtree

A per-route `+layout.ts` that returns data lets every page under it inherit it, so a slug or bot id is written once instead of in each file, where a typo renders the wrong record. A test comparing the layout's literal with its directory name catches the drift. Prerender is declared by the root `+layout.ts`; a nested declaration is redundant but harmless.

## Check what the build emitted, not what the config says

```bash
bun run build
ls .svelte-kit/cloudflare/*.html .svelte-kit/cloudflare/*/*.html
```

A page missing from that listing 404s in production, whatever the route file says.

## The deployed preview is the artifact under review

Pages posts a per-commit and a per-branch host on the pull request: measure that URL, not only `localhost` — its redirect table, asset routing and adapter output are what run in production.
