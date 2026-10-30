# GitHub Pages as a host, and the base path it costs

The base path is work in the app, not a setting on the host, and **whether you pay it turns on one question: is the site served at the root of a domain, or under `/<repository>/`?**

| Served at | How you get there | What it costs in the app |
|---|---|---|
| the root of a domain | a custom domain (the apex, via the host's settings) on a project site, or a repository named `<owner>.github.io` | nothing: internal links, fonts, icons and canonical tags stay as they are; only trailing slashes are a decision |
| `/<repository>/` | a project site with no custom domain | every internal link and static file carries the prefix — see "Under `/<repository>/`" |

**Settle which one is the target before writing any of it.** A first pass built for `/<repository>/` has to be reverted when the operator says the site answers on the domain, and the revert touches every component that was made base-aware. Ask, or read it off the operator's own words: "it answers on `example.com`" is the root case; "no CNAME for now" is the subpath case, and a plan to move the domain later is not the same as serving it now.

**Answer a host-behaviour question before you can deploy.** Find an existing artifact on any live site of that host that exhibits it and fetch that: a `.nojekyll` file at the root of a published Pages site settled whether dot-prefixed paths are served (they are, so a repository whose name starts with a dot gets `/<.repo>/`), and the same one-`curl` probe answers a redirect's shape, a 404, a content type, or how a directory URL answers — no guess, and no waiting for a deployment to find out.

## Root of a domain

- `adapter-static` writes the whole site to `build/`, every route prerendered; no `paths.base`, no `resolve()`/`asset()` wrapper, no relative manifest icons — none of that is needed when nothing carries a prefix.
- `trailingSlash = 'always'` in the root `+layout.ts` writes `<route>/index.html`. Measured on live Pages sites: `/x/` is served from `x/index.html`; `/x` answers **301 → `/x/`** when that file exists, and `/x/` is a **404** when only the flat `x.html` does. So the directory layout is what keeps both forms of an address working, including any address that was published with a slash.
- With `'always'`, the addresses the site itself names should carry the slash — put it in the route table, so hrefs and canonical tags agree with what the host serves, and no call site appends a slash of its own. A page's canonical is the URL that answers 200, not one that redirects to it.
- **A committed `CNAME` file does not configure the domain.** The docs: *"If you are publishing from a custom GitHub Actions workflow, no `CNAME` file is created, and any existing `CNAME` file is ignored and is not required"*, and *"A `CNAME` file in your repository file does not automatically add or remove a custom domain. Instead, you must configure the custom domain through your repository settings or through the API."* Commit it if it was asked for — `static/CNAME` puts it in the artifact, and it records the domain — but tell the operator the switch is Settings ▸ Pages ▸ Custom domain, or they will do the DNS work and get the host's 404 with the file sitting right there. The subdomain convention from branch-published sites ("add `CNAME` last") is a different publishing source and does not transfer.

### The switch, in the order that keeps the dark window to the deploy

1. Settings ▸ Pages ▸ Source: `GitHub Actions`.
2. Settings ▸ Pages ▸ Custom domain: the domain, then verify it with the `_github-pages-challenge-…` TXT record. GitHub advises setting the domain *before* the DNS records — the other order leaves a subdomain open to takeover.
3. DNS: `A @ → 185.199.108.153`, `.109.153`, `.110.153`, `.111.153` (plus `AAAA 2606:50c0:8000::153` and its three siblings), and `www` → `<owner>.github.io`.
4. Merge. The deploy runs on the push to the default branch and publishes in about a minute; until it does the host answers its own 404, so the downtime is the switch plus that deploy. HTTPS follows the certificate — HTTP answers first, and "Enforce HTTPS" appears when it is ready.
5. **"Enforce HTTPS" is a second switch, and it is off by default.** Measured on the deployed site: with it off, `http://<domain>/` answers 200 and the automatic `www` → apex redirect lands on `http://`, so a `www` visitor is dropped onto plain HTTP. The certificate is valid by then (check it with `openssl s_client -connect <pages ip>:443 -servername <domain>`), so the switch can be ticked the moment it is offered.

A root-only build has **no usable preview** at `https://<owner>.github.io/<repository>/`: its absolute links escape the prefix. Once a custom domain is configured, the default URL also redirects to the domain. So say plainly that no preview of the commit exists and name what will carry it, rather than pointing at a URL that will render wrong or bounce.

Cloudflare Pages' `_redirects` and `_headers` are Cloudflare-only files: with the site moving to Pages they are dead weight, and the trailing-slash rules they held are exactly what `trailingSlash: 'always'` supplies.

## Under `/<repository>/`

- `paths.base` from an env var the build step sets:

  ```yaml
  - name: Build
    env:
      DEPLOY_TARGET: pages
      BASE_PATH: /${{ github.event.repository.name }}
    run: bun run build
  ```

  `paths.base` is also what the client router needs: without it, in-app navigation resolves a path under the prefix to no route.
- The artifact root is the site root — `prerender.js` strips `config.paths.base` when it writes files, so the output holds `index.html` and `mama.html`, never a `<repository>/` directory inside it.
- Every internal link and static file goes through `resolve()` / `asset()` from `$app/paths`. SvelteKit 3 has typed routes: the argument must be a route id or a static-relative file name, so a path that comes from data needs one cast — put it in a single module with the reason written down, not at each call site.
- `paths.relative` is true by default and is what keeps the artifact portable: `resolve()`/`asset()` render **relative to the page**, so a prerendered page works under any base. Read the built HTML rather than assuming which form you will get.
- A public-directory file referenced from CSS (`url('/fonts/x.woff2')`) is rebased by Vite, whose `base` SvelteKit sets from `paths.base` — read the emitted stylesheet, since nothing else will check it.
- A web manifest's `icon.src` values resolve against the manifest URL, so they must be relative (`icon-192.png`) or the icons 404 under the prefix.
- `asset()` strips a leading slash itself (with a dev-only warning); keep values static-relative and the wrapper stays a plain cast.
- `$app/paths` cannot be imported outside the SvelteKit build: a `bun test` that reaches a module importing it fails with `Cannot find module '$app/paths'`. Keep the route table base-free and let components apply the base.
- The plain `adapter-static` shape (no fallback, `strict` default) makes a route that cannot be prerender a **failed build** — which is what a static host wants.
- **Keep the host being replaced building only while it still serves the domain.** An adapter chosen by env var (`DEPLOY_TARGET=pages`) leaves the old host's build untouched; removing that host outright is a decision to state in the PR, because its build then fails on a missing output directory while it goes on serving its last successful deployment.

## Enabling the Actions source is the operator's click

- Until the repository's Pages source is `GitHub Actions`, the deploy job fails with `Ensure GitHub Pages has been enabled` from `actions/deploy-pages`.
- It cannot be enabled with the workflow token: `actions/configure-pages`' `enablement` input requires a token other than `GITHUB_TOKEN`, and `POST /repos/{owner}/{repo}/pages` answers 404 without admin. So the handoff is Settings ▸ Pages ▸ Source ▸ `GitHub Actions`, and a repository where a peer's deploy workflow is already failing this way is the normal state, not a defect in the change.
- Actions artifact publishing wants `actions/upload-pages-artifact` on `build/` and `actions/deploy-pages` in a job with `permissions: pages: write, id-token: write` and the `github-pages` environment. Trigger on a push to the default branch plus `workflow_dispatch`; allow a build-only job on PRs so nothing deploys from an unmerged branch.
- A push to a `gh-pages` branch can enable a project site by itself, but it is a different publishing source: mixing it with the Actions flow leaves a red default branch. Do not use it as a bootstrap without asking.

## Verify it

1. Inspect the build: the artifact root is the site root, pages at `index.html` / `<route>/index.html` (root case) or `index.html` / `mama.html` (subpath case), the `CNAME` present if one was asked for, and no root-relative `href`/`src` anywhere in the subpath case.
2. Serve the artifact the way the host serves it — for a project site, artifact root at `/<repository>/`, `/x` → `x.html`; at a domain root, `/x/` → `x/index.html` and `/x` → 301; unknown → 404 — with a ~40-line Bun server, then curl every route and **every asset the HTML and the stylesheet reference** (fonts and portraits included), asserting status and content type, and every internal link target resolving.
3. Drive it in Chromium over CDP (`page-geometry-cdp` skill): read the SvelteKit config's `base`, click a link and confirm a client-side navigation — set a JS marker before the click and read it back after — and that no console error or warning appears. A hydrated app whose router does not know its base looks perfect to curl. Re-read the built hrefs before writing a click selector: a link whose shape changed matches nothing, and `querySelector(...).click()` on `null` aborts the evaluation, so the page silently stays where it was and looks like navigation that did not happen.
4. Prove any other host is unchanged by normalising both builds (asset hashes, the build timestamp, the per-build `__sveltekit_*` id) and diffing the served HTML of the live site against the new build's.
5. The strongest evidence is the host's own build of the commit. When no preview exists — Pages is not enabled yet, or the host being replaced no longer builds the branch — say so, and name the URL that will carry it.
6. **Once it is deployed, prove the live bytes are the bytes you verified** instead of re-running everything against the domain: the rebase-merged commit's tree hash equals your branch tip's (`git rev-parse <sha>^{tree}`), and a content-hashed file fetched from the live host hashes the same as the local build's (`_app/immutable/entry/start.*.js`). Same bytes plus the local browser check is the whole claim.
7. **Bypass a flaky sandbox resolver**: `curl --resolve <domain>:443:185.199.108.153` pins the host, and a whole sweep can come back `000`/`Could not resolve host` while `python3 -c "import socket; socket.getaddrinfo(...)"` resolves fine. Pin the IP for the live checks and read the DNS answer separately, so a resolver hiccup is never reported as the site being down.
