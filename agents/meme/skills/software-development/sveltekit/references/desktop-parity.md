# A Web Surface That Mirrors a Desktop App

When the browser page must look and behave like the desktop app beside it.

## Take the desktop's page model, not Svelte's

- One page, N modes. Mount every surface once in the same grid cell and swap with the desktop's own `show`/`hide`: an `enter`/`leave` class, `hidden` after the fade, the duration read from the stylesheet. `{#if}` remounts the log and loses its scroll, caret, selection and editor history.
- Svelte sets only the classes and attributes it binds. A plain DOM helper ported from the desktop's page can own `hidden` and `enter`/`leave` on a `bind:this` element without fighting the framework — mark the markup's initial `hidden` as a static attribute.
- Own the status line at the depth that hears everything. A page's notice is said by the deepest component that knows, and a layout a level above cannot see it: move the status element to the page, not the module that happened to hold it.
- Put a shared key map in `libs/<name>` and import it from both surfaces; one mapping and one test file, not a copy per app. A new workspace package needs `bun install` before Vite resolves its name — the build error names the bare import.
- The browser already draws the window: no fake traffic lights. Keep the desktop's bar height, padding and control sizes, and let the two surfaces differ only where the platform forces it.
- Parity runs both ways. A later ask may invert it and move a control back onto the desktop, or drop the web's own chrome; say which surface is the reference before you move one, and keep each platform-forced difference named — the desktop's window dots and its assistant, the browser's lack of a model.
- A control that opens a mode is also its way out. Keep it drawn on the mode's page, mark it (`aria-current="page"`) and let a second press close the mode — the search at today, the gear to the day, scroll and caret it left. A control hidden or inert on its own page strands a pointer user, and a phone has no Esc to fall back on; if an earlier decision removed the page's close button, this is how the exit returns without adding one.

## Keys in a browser

- Some combinations are reserved and cannot be prevented: ⌘T/Ctrl+T, ⌘W, ⌘N. Map only what the page can take (⌘F and ⌘, are preventable); give a reserved one a visible control instead of a promise.
- The app's own OS detection decides the modifier: `navigator.userAgentData?.platform ?? navigator.platform` with `/mac/i`. Playwright on Linux reports Linux, so drive the browser with Control and assert that Meta does nothing there — a Meta press proves nothing about the Mac path.

## Measure the target without running it

- A tinyjs desktop app's built page (`apps/<app>/.page/index.html`) uses the same stylesheets and theme as the browser. Open it over `file://` in headless Chromium and read `getBoundingClientRect()`; the binary itself may start and exit with no window under Xvfb, and the page still measures.
- `file://` draws the page but does not load its module script, which is enough for geometry and not for behaviour. Serve the `.page` directory over HTTP and define the bridge with `page.addInitScript` before the module runs — no markup edit, so a rebuild cannot drop it (`tinyjs` → `references/page-harness.md`).
- Prove geometry with a script that asserts the numbers from rendered boxes, then quote them. A screenshot review reads the glyph, not the hit area, and will call equal box margins uneven.
- An equal-margin request around a bar's controls means the hit areas: `(bar height - control size) / 2` is the margin above, and the same number is the gap between controls and from the trailing edge (44 and 34 give 5). Equalise the boxes, not the glyphs.
