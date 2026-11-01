# Data the page can only read while it is built

A prerendered page cannot fetch at request time. When a part must show something the repo does not hold, the build fetches it once and prints it into the HTML. Do not fetch on mount: that gives up prerendering for a value that changes a few times a month.

## Choose the URL first

- Prefer a URL that stays true without a rebuild.
- Otherwise pin what the build saw and state the cost. GitHub has no versionless asset URL: `releases/latest/download/<file>` needs the exact name, which dies when the next release renames it. `releases/download/<tag>/<file>` serves what it names while the release exists.
- The cost is freshness: a release does not rebuild the site. Name the fix in the pull request — a scheduled deploy or a release webhook — and do not add it unasked.

## The shape that stays testable

Two files in `src/lib/data/`: a pure `downloadsFrom(payload, repo)` mapping a release payload to what the page prints, and a thin `latestDownloads(repo, fetchImpl)` making the request and calling it. The route's `load({ fetch })` passes SvelteKit's `fetch` — it exists at prerender time and needs no import. A component never fetches.

```ts
const response = await fetchImpl(`${api}/releases/latest`, {
  headers: { accept: "application/vnd.github+json" },
});
return response.ok
  ? downloadsFrom(await response.json(), repo)
  : [releasesPage(repo)];
```

- Match assets by the **tail** of the name (`-macos-arm64.zip`); the version sits in the middle. One array holds the order and the suffix table, so the page's order is the data's.
- Drop an asset that does not match; never guess a name from a platform.
- One key per row, shared by data and dictionary: no blank label, and a missing translation is a type error.

## Never fail the build

No network, or a 403 from an unauthenticated API in a shared CI egress, degrades to the releases page — one link — never a failed build or a missing block. Test all three: the non-ok response, the thrown request, and a payload naming no assets.

## Verify

1. Grep the built HTML for the hrefs; the count must match the release.
2. HEAD each and read the effective URL: `curl -sIL -o /dev/null -w '%{http_code} %{url_effective}' <url>` — a release asset redirects to a signed host whose `filename=` proves it served the file the page named.
3. Read the block: gap above, link hover colour, focus ring, no sideways scroll at 360px.
