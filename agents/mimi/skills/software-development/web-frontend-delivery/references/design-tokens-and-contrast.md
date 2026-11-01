# Design tokens, ground and contrast

## The rule

A colour is a measured claim: change a ground, a surface or a text tier and recompute every published figure in the same commit. A design doc with stale numbers is worse than one with none.

## Worst-case surfaces

- Measure light text against the **lightest stop** of a ground gradient, not the darkest or the average.
- A translucent panel is a third surface: composite it (`round(fg*alpha + bg*(1-alpha))` per channel) and measure the panel column separately. A tier can pass on the ground and fail on the card.

## Adopting another design's ground

1. Paint the stops exactly (opaque root colour plus the two gradient stops) on a fixed layer behind the content, with the opaque colour on the root element — without it, every gap shows canvas white while a mobile browser resizes the viewport.
2. Put card and pill fills on a **panel token** (a translucent fill with its own border), never on a ground stop: a fill equal to the lightest stop is 1.00:1 and the card vanishes while every text tier passes.
3. One accent per identity: reuse the registered accents and verify each as a link colour on the new ground.
4. Keep a failing tier in the palette only as a record of the rejection, never in prose.

## The arithmetic

`scripts/contrast.ts` prints the ratio on a ground, and on a panel composited over it:

```bash
bun run scripts/contrast.ts '#c9d1d9' '#171834'
bun run scripts/contrast.ts '#c9d1d9' '#171834' --panel '#161b22' 0.6
```

WCAG: relative luminance per channel (`c/12.92` below 0.03928, else `((c+0.055)/1.055)^2.4`; weights 0.2126, 0.7152, 0.0722), ratio `(Lmax+0.05)/(Lmin+0.05)`. AA is 4.5:1 for text, 3:1 for large text and UI edges.

## Porting into a host with its own tokens

- **Map by value, not by name.** The host's `--text` may hold what the page called `--text-soft`. Check each ported rule against the value it had in the original, or a surface lands in the wrong tier with no error anywhere.
- **Add a documented token rather than reaching for the nearest grey** when no host tier matches the imported value: 5.61:1 is not the same claim as 6.59:1.
- **Re-measure the imported tiers on the shared ground**, and say which ones carried over unchanged.
- **Comment a token that only serves a ported subtree**, or a later reader tidies it away.
