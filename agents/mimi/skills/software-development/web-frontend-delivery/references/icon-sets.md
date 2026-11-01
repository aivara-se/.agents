# Adopting a component icon set

## When

The site draws its own SVG glyphs and the operator asks for a real set, or an existing set is replaced and the sizes and strokes must stay coherent with the type. Choose a set that ships components per icon (tree-shakable, no sprite sheet, no icon font): `@lucide/svelte` on Svelte, equivalents elsewhere.

## Install and import

```bash
bun add @lucide/svelte          # same package manager as the repo, never a second one
```

```svelte
<script lang="ts">
	import NotebookText from '@lucide/svelte/icons/notebook-text';
</script>

<NotebookText size={16} />
```

Per-icon imports only. `props`: `size` (default 24), `color` (`currentColor`), `strokeWidth` (default 2), plus any SVG attribute. Icons are `aria-hidden`; the label belongs on the anchor (`aria-label`/`title`).

## Size and stroke against type

A 24px grid at stroke 2 makes size `16` a 1.33 CSS px stroke — lighter than a 2px hand-drawn glyph. Pick the size from the ink you replace:

- a 16px masthead box holds a 16px icon, the weight of 17px text;
- beside a 17px row name, `size={18}` (ink ≈ 10.5px, stroke 1.5);
- change `strokeWidth={2}` only to match another set, and in the shared wrapper.

A glyph must survive its shipped size: render at 16px, screenshot at `--force-device-scale-factor=4`. A flask that reads as a capital `A` is the wrong drawing, and no stroke tweak fixes it; asymmetric shapes survive better than a symmetrical triangle with a crossbar.

## What the set does not carry

Brand marks. Lucide 1.x has no `github`, so a repository link keeps its own Octocat asset — a mask over `currentColor` if it must take the link's colour. Say so in the design doc.

## The two CSS traps

1. **`fill: currentColor` on a container's `svg` overrides the icon's `fill="none"`.** The rule wins over the attribute and every icon becomes a solid silhouette. Delete it; keep `display: block`.
2. **A descendant selector stops matching when the `<svg>` moves into a child component.** `.row svg` is dead against `<ArrowRight />`, and `svelte-check` reports `Unused CSS selector`. Scope it `:global(svg)` and keep the wrapper tight.

## Prove the bundle kept only what it uses

A barrel import or an index re-export pulls the whole set:

```bash
# a path from an icon you did NOT import => 0 files
# a path from one you DID import  => 1 file
grep -rl 'M14 2v6a2' build --include=*.js | wc -l
```

Quote the count in the PR, and name the cost: one package for a set you keep drawing from.

## Documentation

Update a design doc that names glyphs to the set and the size, with the brand-mark exception on the same line; one that still prescribes the hand-drawn mark describes a site that no longer ships.
