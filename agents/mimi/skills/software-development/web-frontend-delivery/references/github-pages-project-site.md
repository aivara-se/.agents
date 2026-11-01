# GitHub Pages as a host, and the base path it costs

The base path is work in the app, not a host setting. **One question decides it: is the site served at the root of a domain, or under `/<repository>/`?**

| Served at | How you get there | What it costs in the app |
| --- | --- | --- |
| the root of a domain | a custom domain (the apex, via the host's settings) on a project site, or a repository named `<owner>.github.io` | nothing: internal links, fonts, icons and canonical tags stay as they are; only trailing slashes are a decision |
| `/<repository>/` | a project site with no custom domain | every internal link and static file carries the prefix — see "Under `/<repository>/`" |

**Settle the target first.** A pass built for `/<repository>/` must be reverted when the site answers on the domain, and the revert touches every component made base-aware. "It answers on `example.com`" is the root case; "no CNAME for now" is the subpath case; a plan to move the domain later is not serving it now.

**Answer a host-behaviour question before you deploy.** Fetch any live artifact that exhibits it: a `.nojekyll` at a published site's root settled whether dot-prefixed paths are served (they are). One `curl` answers a redirect's shape, a 404, a content type, or a directory URL.

## Root of a domain

- `adapter-static` writes the site to `build/`, every route prerendered; no `paths.base`, no `resolve()`/`asset()`, no relative manifest icons.
- `trailingSlash = 'always'` in the root `+layout.ts` writes `<route>/index.html`. Measured on live Pages sites: `/x/` is served from `x/index.html`; `/x` answers **301 → `/x/`** when that file exists, and `/x/` is a **404** when only the flat `x.html` does. The directory layout keeps both forms working. Put the slash in the route table, so hrefs and canonical tags agree with what the host serves: a canonical is the URL that answers 200, not one that redirects to it.
- **A committed `CNAME` file does not configure the domain.** The docs: it _"does not automatically add or remove a custom domain"_; you configure it in repository settings or through the API. Commit `static/CNAME` if it was asked for — it records the domain — but tell the operator the switch is Settings ▸ Pages ▸ Custom domain, or they do the DNS work and get a 404. The branch-published convention ("add `CNAME` last") does not transfer.

### The switch, in the order that keeps the dark window to the deploy

1. Settings ▸ Pages ▸ Source: `GitHub Actions`.
2. Settings ▸ Pages ▸ Custom domain: the domain, then verify it with the `_github-pages-challenge-…` TXT record. Set it _before_ the DNS records — the other order leaves a subdomain open to takeover.
3. DNS: `A @ → 185.199.108.153`, `.109.153`, `.110.153`, `.111.153` (plus `AAAA 2606:50c0:8000::153` and its three siblings), `www` → `<owner>.github.io`.
4. Merge. The deploy publishes in about a minute; until it does the host answers its own 404, so downtime is the switch plus that deploy.
5. **"Enforce HTTPS" is a second switch, off by default.** With it off, `http://<domain>/` answers 200 and the automatic `www` → apex redirect lands on `http://`. Check the certificate with `openssl s_client -connect <pages ip>:443 -servername <domain>`, then tick it.

A root-only build has **no usable preview** at `https://<owner>.github.io/<repository>/`: its absolute links escape the prefix, and the default URL redirects once the domain is configured.

Cloudflare Pages' `_redirects` and `_headers` are Cloudflare-only: on Pages they are dead weight, and `trailingSlash: 'always'` supplies the rules they held.

## Under `/<repository>/`

- `paths.base` from an env var the build step sets:

  ```yaml
  - name: Build
    env:
      DEPLOY_TARGET: pages
      BASE_PATH: /${{ github.event.repository.name }}
    run: bun run build
  ```

  The client router needs it too, or in-app navigation resolves a path under the prefix to no route.

- The artifact root is the site root: `prerender.js` strips `config.paths.base` when it writes, so the output holds `index.html` and `mama.html`, never a `<repository>/` directory.
- Every internal link and static file goes through `resolve()` / `asset()` from `$app/paths`. SvelteKit 3 has typed routes, so a path from data needs one cast — in a single module with the reason written down, not at each call site.
- `paths.relative` is true by default and keeps the artifact portable: `resolve()`/`asset()` render **relative to the page**. Read the built HTML rather than assuming the form.
- Three prefix traps: a manifest's `icon.src` resolves against the manifest URL, so keep it relative (`icon-192.png`); `asset()` strips a leading slash itself (dev-only warning), so keep values static-relative; and Vite rebases a CSS `url('/fonts/x.woff2')` from `paths.base` — read the emitted stylesheet, since nothing else checks it.
- `$app/paths` cannot be imported outside the SvelteKit build: a `bun test` reaching a module that imports it fails with `Cannot find module '$app/paths'`. Keep the route table base-free.
- Plain `adapter-static` (no fallback, `strict` default) makes a route that cannot prerender a **failed build**, which is what a static host wants.
- **Keep the host being replaced building while it still serves the domain.** An adapter chosen by env var (`DEPLOY_TARGET=pages`) leaves the old host's build untouched; removing it is a decision to state in the PR, because its build then fails on a missing output directory while it serves its last deployment.

## Enabling the Actions source is the operator's click

- Until Pages source is `GitHub Actions`, the deploy job fails with `Ensure GitHub Pages has been enabled` from `actions/deploy-pages`. It cannot be enabled with the workflow token: `actions/configure-pages`' `enablement` input needs another token, and `POST /repos/{owner}/{repo}/pages` answers 404 without admin. The handoff is Settings ▸ Pages ▸ Source ▸ `GitHub Actions`; a peer's deploy failing this way is normal state.
- Publish with `actions/upload-pages-artifact` on `build/` and `actions/deploy-pages` under `permissions: pages: write, id-token: write` and the `github-pages` environment. Trigger on a push to the default branch plus `workflow_dispatch`; allow a build-only job on PRs.
- A push to a `gh-pages` branch enables a project site by itself, but it is another publishing source: mixing it with the Actions flow leaves a red default branch. Do not bootstrap it without asking.

## Verify it

1. Inspect the build: pages at `index.html` / `<route>/index.html` (root case) or `index.html` / `mama.html` (subpath case), the `CNAME` if one was asked for, and no root-relative `href`/`src` in the subpath case.
2. Serve it the way the host serves it (project site: artifact root at `/<repository>/`, `/x` → `x.html`; domain root: `/x/` → `x/index.html`, `/x` → 301) with a ~40-line Bun server. Curl every route and **every asset the HTML and the stylesheet reference**, asserting status and content type.
3. Drive it in Chromium over CDP (`page-geometry-cdp`): read the config's `base`, set a JS marker, click a link, read it back after the client-side navigation, check for console errors. A hydrated app whose router does not know its base looks perfect to curl. Re-read the built hrefs before writing a selector: `querySelector(...).click()` on `null` aborts the evaluation, so the page stays put and looks like a failed navigation.
4. Prove the other host is unchanged by normalising both builds (asset hashes, build timestamp, the per-build `__sveltekit_*` id) and diffing the live HTML against the new build's. The strongest evidence is the host's own build of the commit; when none exists, say so and name the URL that will carry it.
5. **Once deployed, prove the live bytes are the bytes you verified:** the merged commit's tree hash equals your branch tip's (`git rev-parse <sha>^{tree}`), and a content-hashed file fetched live hashes the same as the local build's (`_app/immutable/entry/start.*.js`).
6. **Bypass a flaky sandbox resolver**: `curl --resolve <domain>:443:185.199.108.153` pins the host, and a sweep can return `000`/`Could not resolve host` while `python3 -c "import socket; socket.getaddrinfo(...)"` resolves fine. Pin the IP for live checks and read DNS separately.
