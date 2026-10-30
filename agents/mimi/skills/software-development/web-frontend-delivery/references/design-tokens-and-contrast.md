# Design tokens, ground and contrast

## The rule

A colour is a measured claim. Changing a ground, a surface or a text tier means recomputing **every** figure the repository publishes, in the same commit: a design doc with stale numbers is worse than one with none, because the next reader trusts it.

## Worst-case surfaces

- Light text is worst on the **lightest stop** of a ground gradient. Measure every tier against that stop, not against the darkest one or the average.
- A translucent panel over the ground is a third surface. Composite it (`round(fg*alpha + bg*(1-alpha))` per channel) and measure the panel column separately — a tier can pass on the ground and fail on the card.

## Adopting another design's ground

1. Take the stops exactly (opaque root colour plus the two gradient stops) and paint them on a fixed layer behind the content, with the opaque colour on the root element: a page with no opaque colour anywhere shows canvas white in any gap, most visibly while a mobile browser resizes the viewport.
2. Move card and pill fills onto a **panel token** — a translucent fill with its own border — not onto a ground stop. A surface equal to the lightest ground stop measures 1.00:1 and the card disappears while every text tier still passes.
3. Keep one accent per identity and reuse the accents the design system already registered; verify each one as a link colour on the new ground (identity colours usually land at 9:1–13:1 and stay valid).
4. Keep a tier that fails AA in the palette only as documentation of the rejection, and never in prose.

## The arithmetic

`scripts/contrast.ts` prints the ratio for a text colour on a ground, and on a panel composited over it:

```bash
bun run scripts/contrast.ts '#c9d1d9' '#171834'
bun run scripts/contrast.ts '#c9d1d9' '#171834' --panel '#161b22' 0.6
```

WCAG: relative luminance per channel (`c/12.92` below 0.03928, else `((c+0.055)/1.055)^2.4`; weights 0.2126, 0.7152, 0.0722), ratio `(Lmax+0.05)/(Lmin+0.05)`. AA is 4.5:1 for text, 3:1 for large text and UI edges.

## Porting a page into a host that has its own tokens

- **A token name is not a value: map by value, not by name.** Two systems from the same family still disagree — the host's `--text` may hold what the imported page called `--text-soft`, and the page's `--text` may be the host's `--text-strong`. Read each rule you port against the value it resolved to in the original, or a surface that looked identical in both stylesheets renders in the wrong tier with no error anywhere.
- **When the host has no tier with the imported value, add it as a documented token instead of reaching for the nearest grey.** A muted tier at 5.61:1 is not the same claim as one at 6.59:1, and the design doc is where the number lives — a silent substitution is a contrast figure nobody measured.
- **Re-measure the imported tiers on the shared ground anyway.** They usually carry over unchanged (heading, body, quiet and the identity accents all landed on the same ratios), and saying which ones did is the point: the doc records a measurement, not an assumption.
- **Where a token only ever appears inside a ported subtree, say so in its comment.** Two muted greys in one stylesheet need a reason a later reader can check, or someone will "tidy" one of them away.
