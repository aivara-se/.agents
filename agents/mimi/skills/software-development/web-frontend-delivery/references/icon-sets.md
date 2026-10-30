# Adopting a component icon set

## When

- The site draws its own SVG glyphs (a page, an arrow, a flask) and the operator asks for a real set, or a
  new glyph is needed and hand-drawing it is the alternative.
- An existing set is being replaced or extended, and the sizes and stroke weights have to stay coherent
  with the type around them.

Choose a set that ships components per icon (tree-shakable, no sprite sheet, no icon font). On Svelte that
is `@lucide/svelte`; other frameworks have equivalents.

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

Per-icon imports only. `props`: `size` (default 24), `color` (`currentColor`), `strokeWidth` (default 2), plus
any SVG presentation attribute. Icons carry `aria-hidden="true"` unless given an accessible prop, and the
anchor around them carries `aria-label`/`title` — the label belongs on the link, not the glyph.

## Size and stroke against type

The set draws on a 24px grid at stroke 2. Rendered at size `16` the stroke is `2 × 16/24 = 1.33` CSS px,
which is lighter than a hand-drawn glyph at 2px on a 16px grid. Pick the size from the ink you are
replacing, not from a round number:

- a 16px masthead box holds a 16px icon; it reads as the same weight as 17px text;
- a glyph beside a 17px row name wants `size={18}` (ink ≈ 10.5px, stroke 1.5) rather than 16;
- `strokeWidth={2}` is the set's own; change it only when two icons of different sets must match, and then
  change it in the shared wrapper, not per call site.

A glyph must survive at its shipped size. Render it at 16px, screenshot at `--force-device-scale-factor=4`
and look: an Erlenmeyer flask that reads as a capital `A` is the wrong drawing, and no stroke tweak fixes it.
Round-bodied and asymmetric shapes survive small sizes better than a symmetrical triangle with a crossbar.

## What the set does not carry

Brand marks. Lucide 1.x has no `github` (brand icons were removed), so a link to a repository keeps its own
Octocat asset — a mask over `currentColor` if it must take the link's colour. Say that in the design doc:
the set draws interface glyphs, the brand mark is an asset.

## The two CSS traps

1. **`fill: currentColor` on a container's `svg` overrides the icon's `fill="none"`.** The set ships
   `fill="none"` as a presentation attribute, and a stylesheet rule wins over it, so every icon becomes a
   solid silhouette. Delete the fill rule when the glyph becomes a component (`stroke="currentColor"`
   already inherits the colour) and keep only placement: `display: block`.
2. **A descendant selector stops matching when the `<svg>` moves into a child component.** `.row svg` was
   valid against a hand-drawn inline SVG and is dead against `<ArrowRight />`; `svelte-check` reports
   `Unused CSS selector` rather than a visual bug. Scope the child markup with `:global(svg)` (and note that
   the rule then applies to anything inside the wrapper, so keep the wrapper tight).

## Prove the bundle kept only what it uses

Per-icon imports are tree-shaken, but prove it on the artifact — a barrel import or an index re-export
pulls the whole set:

```bash
# a path from an icon you did NOT import => 0 files
# a path from one you DID import  => 1 file
grep -rl 'M14 2v6a2' build --include=*.js | wc -l
```

Quote the count in the pull request when adding the dependency, and name it as the cost: one package for a
set you will keep drawing from, not one package per glyph.

## Documentation

When a design doc lists glyphs by name ("the log's page-of-lines mark"), the swap renames them: update that
sentence to the set and the size, and add the brand-mark exception in the same line. A doc that still
prescribes the hand-drawn mark describes a site that no longer ships.
