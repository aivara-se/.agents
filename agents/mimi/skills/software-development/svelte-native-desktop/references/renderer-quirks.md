# gpuix-svelte renderer quirks

The details behind the SKILL.md pitfalls. Read before writing a layout.

## Elements

`div`, `text`, `img`, `svg`, `input`, `textarea`, `canvas`, `code`, `diff`, `markdown`,
`virtual-list`, `anchored`. Any other tag renders as a `div` with a warning. `button` does not
exist: a clickable control is a `div` with `role="button"`, `tabindex="0"`, `onclick`, an
`aria-label`, and `hitbox="self"` when it contains an icon.

`<svg source={markup}>` takes raw SVG and tints it with the element's `color`; the icon should
use `fill="currentColor"` paths or strokes with `stroke="currentColor"`. `img src` takes a
path, a data URL or an http(s) URL.

## Style subset

Layout is flexbox; the default display is already flex. Supported:

- `display: flex`, `flex-direction`, `flex-wrap`, `flex-grow`, `flex-shrink`, `flex-basis`
  (numbers are px), `align-items`, `align-self`, `justify-content`, `gap`, `row-gap`,
  `column-gap`.
- `grid-template-columns: <n>` / `grid-template-rows: <n>` take a **count of equal tracks**,
  not track sizes. For a date column plus a body column, use a flex row with a fixed-width
  first child.
- Size: `width`, `height`, `min-*`, `max-*` in px, rem, %, or auto; `aspect-ratio`.
- Box: `padding*`, `margin*`, `border-width*`, `border-color`, `border-radius*`,
  `border-style: solid | dashed`, `box-shadow`, `outline-*`.
- Position: `position: absolute` with `top/right/bottom/left`; **no `fixed`**, no `z-index` —
  paint order is document order, so later siblings paint on top and a `<Portal>` is the escape.
- Text: `font-size`, `font-family`, `font-weight` (100–900), `text-align`, `line-height`
  (**px or rem only**), `white-space: normal | nowrap`, `text-overflow: ellipsis`,
  `line-clamp`, `text-decoration`.
- Colour: `color`, `background-color`, `background: linear-gradient(...)`, `opacity`,
  `selection-color`, `scrollbar-color`, `scrollbar-width`.
- `overflow`, `overflow-x`, `overflow-y`; `cursor`; `pointer-events: auto | none`;
  `user-select`.
- States: `:hover`, `:active`, `:focus-visible`, and the equivalent `hover=`, `active=`,
  `focus-visible=` attributes. One tag plus classes per selector; no combinators, no
  attribute selectors, no `:not`.

Dropped or different: `display: none` (use `{#if}` or `visibility: hidden`), `@media`,
`letter-spacing`, `transform`, `transition`, `text-transform`, `caret-color`, `flex: 1`
(write `flex-grow: 1`), `border: 1px solid` (write width + colour), unitless numbers as
fractions. Text properties inherit (colour, font, line-height, text-align, white-space);
layout properties do not.

Inline `style`, `style:` directives and CSS variables (`set_css_vars`) all work; variables
work inside class rules and inline styles.

## Events

`onclick`, `onauxclick`, `onmousedown/up/move`, `onmouseenter/leave`, `onkeydown/up`,
`onfocus`, `onblur`, `onscroll`, `onscrollchange`, `onlayout`, `onfiledrop`,
`onmotioncomplete`, `onhighlight`, `onmousedownoutside`.

- Mouse events go to the element under the pointer and **do not bubble**. Add
  `hitbox="self"` to any clickable ancestor whose children paint, or the child swallows the
  click.
- `onchange` carries the field's text in `e.value`; there is no `bind:`.
- `textarea` Enter inserts a newline unless `onsubmit` is set, then Enter submits and
  Shift+Enter inserts.
- `onlayout` gives `e.width` / `e.height` of the border box after first paint and on resize.
- `onscrollchange` gives `e.scrollX` / `e.scrollY` after any scroll, wheel, `scrollTo` or
  `scrollIntoView`; offsets are 0 at the start and **negative as content moves up**.
  Distance from the bottom = `contentHeight + scrollY - viewportHeight`.
- Window keys: `on_window_key('keydown', handler)` returned from an `$effect`; `e.editing`
  tells the handler a field has focus. Tab moves focus through tab stops automatically.

## Textarea sizing

`<textarea>` takes `minRows` / `maxRows`; height is rows × line-height. It does not report a
content height and it does not grow. Wrap measurement that matched GPUI at 544px:

```ts
import { create } from 'fontkit';
const face = create(readFileSync('fonts/newsreader-450.ttf'));
const at = (s: string) => face.layout(s).advanceWidth * (19 / face.unitsPerEm);
// greedy: accumulate words + a space, break when the next word overflows
const rows = Math.max(1, Math.ceil(lines));
```

Cache by `${width}:${text}`; a note that is re-measured on every keystroke is fine at this
size but not for a long log.

## Fonts

- `register_font(bytes)` takes TTF/OTF bytes (not WOFF2); convert first with fontTools.
- Registration goes through the native window: before `render()` there is no native and the
  call is a no-op. Register in a root `$effect`, set a `ready` flag, mount the tree under
  `{#if ready}`. Keep a module-level `registered` guard so a hot remount does not re-register
  (and so an early no-op call does not consume the only attempt).
- The family name is the one the file declares (name ID 16, else ID 1). **Write it unquoted**
  in `font-family`: `font-family: Newsreader` resolves, `font-family: 'Newsreader'` silently
  falls back to the default sans, and a multi-word family cannot be written unquoted at all —
  rename the face to one word (name IDs 1/4/16) before registering, or that element keeps the
  system font.
- A variable TTF registers, but pin it to the weight the app uses (`fontTools.varLib.instancer`,
  both axes for a face like Newsreader's wght+opsz) and keep the declared weight; a static
  instance has no 450 face to match.
- A missing family falls back to the default sans silently; confirm the face on a screenshot.
- Registering from `app.ts` before `render_hot` does nothing — that was the actual cause of
  "fonts don't work", not the CSS.

## Scroll, dialogs, window

- A scroll container is a `div` with `overflow-y: auto`; give it `flex-grow: 1` and
  `min-height: 0` inside a column. `Scroller` from `gpuix-svelte/components/Scroller.svelte`
  draws a draggable thumb when you want a visible scrollbar.
- `get_native()?.scrollTo(node.nativeId, 0, 0)` resets the offset; the node comes from
  `{@attach}`. Wait a tick after mounting entries so the ids exist.
- Modals: `<Portal>` from `gpuix-svelte/components/Portal.svelte`, a full-window scrim with
  `pointer-events: auto`, and the card centred by a flex wrapper. The portal paints above the
  app regardless of where it sits in the component.
- `window_size` is reactive in templates/effects (polled while read); use it for the
  responsive breakpoint a CSS `@media` would have carried.
- `window_insets` reports safe area and keyboard; `set_window_title`, `focus_element`,
  `blur`, `activate_window`, `toggle_fullscreen` are no-ops in headless and browser builds.

## Testing

`mount_headless` and the `click_test_id`/`type`/`all_text` helpers need the native test
renderer: present on macOS and Windows, absent from the Linux x64 prebuild. Automation
(`launch()`) drives a real window and is the cross-platform fallback where a window exists.
