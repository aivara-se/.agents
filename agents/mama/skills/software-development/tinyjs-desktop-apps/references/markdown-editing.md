# Markdown editing in place

One view, no preview pane: the note renders while the person types in it.

## The fork

- **Text is the model.** The buffer holds the markers; the view hides them when the caret is outside the span. The save writes what is on screen, so no serializer can lose a character.
- **Document is the model.** Markers never exist; a serializer writes Markdown on save (Milkdown, ProseMirror, Lexical). Truer WYSIWYG, but every save rewrites the note.

Pick the first for an app that saves as it types. The second puts a lossy step in the one path the app promises. MarkText is the second fork: its Muya editor is 55,000 lines of TypeScript and still serialises block state back to Markdown on save.

## The primitive

- CodeMirror 6: `Decoration.replace` hides a range and `EditorView.atomicRanges` makes the caret skip it. The markers stay in the document, so offsets, copy, search and the save all see the source text.
- Reveal on contact: walk the parse tree and hide both markers unless the selection touches the node; then keep them, dimmed. Raw source at the caret, rendered text everywhere else — the Typora behaviour.
- Recompute on `tr.docChanged || tr.selection`. Four inline styles plus fences parse well inside a frame at note size.
- Inline decorations can come from a `ViewPlugin` over visible ranges. **Block decorations must come from a `StateField`**: the view is not allowed to change layout. Parse the whole document there, and virtualise only when a note can reach megabytes.
- `Decoration` is exported by `@codemirror/view`, not `@codemirror/state`. esbuild reports "No matching export" on the wrong package, not the missing one.
- Emit the set with `Decoration.set(ranges, true)`. The sort flag handles nested emphasis, where one mark contains another; `RangeSetBuilder` throws on overlapping or out-of-order ranges.
- Skip a fenced block's children while walking (`return false`), or the inline rules style text inside the code.
- Hide a fence line with a block widget over `[line.from, line.to]`. Never end the range after the newline: on the opening fence it drops the next line's decoration, so the first code line renders at the body margin with no background; on the closing fence it eats the blank line below, so the gap under the block measures half the gap above.
- Give that widget the height of the space you want, with `estimatedHeight` equal to its CSS height. A margin on `.cm-line` is not in CodeMirror's height map: it paints a gap that the caret and the scroll position do not know about, and a block widget of 12px is measured.
- Qualify every page rule that competes with CodeMirror's injected theme: `.cm-content .md-code-line`, not `.md-code-line`. The injected sheet lands after the page's, so an equal-specificity rule loses; the symptom is half-applied styling, where colour and radius take and padding silently reads the editor's default 6px.
- Style the content lines with `Decoration.line`; give the first and last a start and end class for padding and radius, so the block reads as one surface. When the caret is inside, keep the fence lines visible and style them the same way.
- Spacing has two layers, and they are not interchangeable: the hidden fence's block widget carries the room outside the surface, and the first and last line classes carry the padding inside it. Values that read right against 19px body text: 12px outside, 18px horizontal and 12px vertical inside, code one step down at 0.78em.
- A `<textarea>` cannot hide characters. A contenteditable that keeps `textContent` equal to the body can, but you own caret, IME and undo on three webviews.

## The caret

- `drawSelection()` hides the native caret and draws its own: 1.2px, black, with a blink animation on the cursor layer. On a dark window a black hairline is invisible, and a still frame can catch the off phase, so "the caret is missing" is the report you get.
- Style the drawn cursor where the injected theme cannot win: `.cm-editor .cm-cursor, .cm-editor .cm-dropCursor { border-left: 2px solid var(--accent) }`. Colour and width fix "the caret is invisible" without touching its rhythm.
- Keep the blink. A steady caret gets reported back as a fault, because blinking is what a caret does. `drawSelection({ cursorBlinkRate: 0 })` is for a person who asks for a steady caret, never the fix for poor contrast.
- Take focus again when the window activates (`window.addEventListener('focus', () => view.focus())`). The first paint can land before macOS makes the window active, and an unfocused editor draws no cursor at all.

## Verify

- Drive the page in Chromium and in WebKit with Playwright. The shipped app is WKWebView or WebKitGTK, so Chromium alone proves nothing about the webview that runs it.
- Assert the rendered `.cm-content` text lacks the markers while the stored text keeps them. Click inside a span and assert the markers return; click outside and assert the fence lines vanish; reload and assert the source is unchanged.
- Assert the code block is one element: every code line carries the block class, no fence line survives as a `.cm-line`, and the first code line is padded like the rest.
- Measure block spacing with `Range.getBoundingClientRect()`, never from a screenshot or a line box: a line box carries its leading, so two equal 43px gaps read as uneven. Compare the glyph box to the block edge on both sides.
- Prove the caret paints, not only that `.cm-cursor` exists with a rect. Screenshot with the cursor layer shown and hidden and compare pixels: an element can report a 2×21 rect and paint nothing.
- WebKit needs its host libraries before it launches: `bunx playwright install --with-deps webkit`.
- Screenshot the built app in both appearances. A runner defaults to light, so a caret or a border that reads well there can be invisible on the dark window the person actually uses.

## Measured weight

esbuild, minified ESM, gzip. Re-measure; these are a shape, not a constant.

| configuration                   | min    | gzip   |
| ------------------------------- | ------ | ------ |
| `state` + `view`                | 200 KB | 64 KB  |
| + `commands` history and keymap | 264 KB | 86 KB  |
| + `drawSelection`               | 272 KB | 88 KB  |
| + `@lezer/markdown`             | 332 KB | 107 KB |
| + `@codemirror/lang-markdown`   | 496 KB | 170 KB |
| CodeMirror 5 + markdown mode    | 208 KB | 68 KB  |
| CodeJar                         | 8 KB   | 3 KB   |

CodeMirror 5 is archived; CodeJar is a DOM model that rewrites `innerHTML` and has no block fences. The light option is less CodeMirror, not another library: drop `lang-markdown` and scan with `@lezer/markdown` or a small scanner.

```sh
bun add @codemirror/state @codemirror/view
bunx esbuild src/entry.js --bundle --minify --format=esm --outfile=dist/x.js
gzip -c dist/x.js | wc -c
```

## Invariants

- Open and close with no edit writes identical bytes. Never normalize a note on load.
- The renderer never mutates the buffer.
- An unmatched marker and an unclosed fence stay literal. The parser cannot fail a note.

## Decisions to settle first

- One marker set for italic (`*x*` or `_x_`), and whether escapes and nesting exist.
- Everything outside the subset stays literal: headings, lists, links, tables.
- Copy yields the source; check it, because CSS-hidden text can be dropped from a native copy.
- Paste inserts plain text and strips HTML.

On a multi-megabyte app, a few hundred KB is not the decider; maintenance and webview behaviour are.
