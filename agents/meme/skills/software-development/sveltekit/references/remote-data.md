# Data the page can only read while it is built

A prerendered page has no host to ask at request time. When a part must show something the repo does not hold — a project's latest release and its archives, a repo's stars — the build fetches it once and prints the answer into the HTML. Reach for this before reaching for client-side JavaScript: the site is prerendered for a reason, and a fetch on mount trades that away for a value that changes a few times a month.

## Choosing the URL, before writing any code

- Prefer a URL that stays true without a rebuild. If the provider offers one, the page needs no data at all.
- When it does not, pin to what the build saw and state what that costs. For GitHub releases there is no versionless asset URL: `releases/latest/download/<file>` needs the exact file name, and a name read at build time is dead the moment the next release renames it — that URL 404s. `releases/download/<tag>/<file>` keeps serving exactly what it names, for as long as the release exists.
- The cost is freshness, and it is real: the page names the release from the last build. A product release does not rebuild the site. Name the fix in the pull request — a scheduled deploy, or a release webhook — and do not add it unasked.

## The shape that keeps it testable

Put the whole thing in `src/lib/data/`, split in two:

- a pure `downloadsFrom(payload, repo)` mapping a release payload to what the page prints;
- a thin `latestDownloads(repo, fetchImpl)` making the request and calling the first.

The route's `load({ fetch })` passes SvelteKit's `fetch` — it exists at prerender time and needs no import. A component never fetches.

```ts
const response = await fetchImpl(`${api}/releases/latest`, {
	headers: { accept: 'application/vnd.github+json' }
});
return response.ok ? downloadsFrom(await response.json(), repo) : [releasesPage(repo)];
```

- Match assets by the **tail** of the file name (`-macos-arm64.zip`): the version sits in the middle and changes. Keep the order and the suffix table in one array, so the page's order is the data's order.
- Drop an asset that does not match and print the ones that do; never guess a file name from a platform.
- Every download row needs one key shared by the data and the dictionary, so a platform cannot render a blank label and a missing translation is a type error.

## Never let the build fail on it

Wrap the request: a build with no network, or a 403 from an unauthenticated API exhausted by a shared CI egress, must degrade — to the releases page, one link — never to a failed build and never to a missing block. Test all three: the non-ok response, the thrown request, and a payload naming none of the assets.

## Verify

1. Grep the built HTML for the hrefs; the count must match the release.
2. HEAD each one and read the effective URL, not just the status: `curl -sIL -o /dev/null -w '%{http_code} %{url_effective}' <url>` — a release asset redirects to a signed asset host whose `filename=` is the proof it served the file the page named.
3. Read the rendered block: its gap to the part above, the links' colour on hover, the focus ring, and no sideways scroll at 360px.
