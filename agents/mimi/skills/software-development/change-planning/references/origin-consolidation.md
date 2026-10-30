# Folding several subdomains into paths on one origin

Decision depth for a move like `a.example.com`, `b.example.com` → `example.com/a`, `example.com/b`. The plan asks the operator for the redirect decision and for the ground/route decisions; this file is what makes those options concrete.

## Redirect options, in the order to recommend them

| Option | How | Needs | Cost |
|---|---|---|---|
| A. Zone-level redirect | One rule per hostname at the DNS provider: `<name>.example.com/*` → `example.com/<name>/`, permanent | Zone/DNS access (operator) | Clean 301, SEO-safe; the old sites can then be archived or deleted |
| B. Redirect page in the retired repo | The old repo is reduced to a single page: `<meta http-equiv="refresh">` plus `<link rel="canonical">` to the new path | Nothing beyond the repo itself (agent-only) | Not a real 301, the second deployment stays alive, DNS keeps pointing at the old host |
| C. No redirect | Subdomains retired | Operator | Every existing link and every indexed URL breaks |

Recommend A, offer B as the no-DNS fallback, and never present C as the default. Whichever is chosen, the same rule applies: **a URL that leaves the plan without a successor is a broken move.**

## Constraints worth checking before you write the plan

- **A path-level redirect file cannot redirect a hostname.** On Cloudflare Pages, `static/_redirects` matches request paths on that origin only; `sub.example.com` → `example.com/path` is a zone-level rule or nothing. Do not promise it from inside the application.
- **A static host claims a custom domain per site, and the claim moves separately from DNS.** Pointing the record at a new host does not transfer the claim; the old site must release it first. So "repoint DNS" is not a complete instruction — say who releases what, in what order.
- **Order matters when a domain is claimed last.** Adding the domain file (a `CNAME` file, a custom-domain setting) before the record resolves publishes a site that advertises an address that does not answer. Record first, then verify it resolves, then claim.
- **Per-path pages need their own canonical and social tags.** Each new route must derive `<link rel="canonical">` and `og:url` from the main origin, or the merged page keeps telling crawlers the retired subdomain is canonical.
- **Route paths belong in the one route table, not inline.** If the target repo already centralises paths (a route module that nav links and canonical tags both read), add the new entries there; per-page hard-coded paths are how a merged site drifts.
- **Per-instance identity goes in data, per the target's own rule.** Where the target repo declares one source per fact, the per-instance accent, portrait, tagline and log become records in its data file — not inline markup copied from the old site.

## Making the move verifiable

After the change lands, these are the checks a reviewer can rerun:

```bash
# every new path answers, every old address still answers or redirects
for u in https://example.com/a/ https://example.com/a/log https://a.example.com/; do
  printf "%-34s " "$u"
  curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" -m 15 "$u"
done

# the new page advertises the new origin, not the old one
curl -s https://example.com/a/ | grep -o 'rel="canonical"[^>]*'
```

Then the checks no script does: read the rendered page at ~360px wide, and confirm the accent/identity still matches the portrait it was drawn from.
