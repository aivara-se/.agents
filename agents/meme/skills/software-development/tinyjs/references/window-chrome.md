# Frameless and translucent windows

The window is the page: no title bar, controls in HTML, and the page's colour at partial alpha over a vibrancy material.

## Configure

- Set it in `tinyjs.json` under `chrome`, never only at runtime: `{ "frame": false, "windowControls": false, "transparent": true, "vibrancy": "sidebar" }`. `setChrome()` after the first paint flashes the default title bar.
- `frame: false` keeps native resize edges and focus. On Linux tinyjs adds 5px grips on all eight edges; `data-tiny-noresize` on `<html>` drops them.
- Vibrancy is macOS and Windows only (Windows 11 maps `hud`/`popover`/`menu` to Acrylic, others to Mica); Linux shows the bare alpha. The blur cannot be checked on a Linux build — say so.
- Prefer a material name spelled identically on every implementation (`sidebar`, `hud`, `popover`, `menu`): the docs normalise names, an unknown name fails silently as "no material".
- `macos`/`windows`/`linux` blocks merge onto the root object, so a per-OS `chrome` keeps the root's `frame` and overrides only the fields it names.

## Page shape

- One alpha token for the window, one opaque token for surfaces that must not show the desktop: `--window: rgba(250,249,246,0.8)` (dark `rgba(18,17,16,0.8)`) on `body`, with `--bg` solid for the status pill and the error sheet.
- The bar is a flex sibling above the app container: `body { display:flex; flex-direction:column }`, `.app { flex:1; min-height:0 }`, `.bar { flex:none; height:44px }`. A `height:100%` container pushes the bar off screen.
- `data-tiny-drag` on the bar. Buttons, links, inputs and textareas inside it stay interactive and a double click zooms — no JS for either.
- Keep the bar out of any container an error state hides, and inset a full-window error overlay below it (`inset: var(--bar) 0 0`): a frameless window whose close button is hidden cannot be closed.
- Remove chrome that existed only because controls floated over the content: a fade under floating buttons is stale once they sit in a bar, and so is their `position: fixed`.

## Controls

- `tiny.win.close()` on the main window quits the app. Await the flush first; do not block the close on a failed save, which traps the person in a window that will not shut.
- `tiny.win.minimize()` and `tiny.win.zoom()` are the other two; `tiny.win.onState(fn)` when the dots should reflect focus, minimize or maximize.
- 26px hit target, 11px dot on `::before` with `background: currentColor`, the colour on the button — one rule per dot, no SVG.

## Prove the alpha headless

- `import -window <id>` flattens a transparent window over black, so capture the root and crop the rect read from `xdotool getwindowgeometry` in the same run: `import -window root -crop 1080x720+160+90 +repage shot.png`.
- The arithmetic is the proof. Over a black root the page reads 0.8 × its colour, so `#faf9f6` gives `rgb(200,199,197)`; a value equal to the solid colour means transparency never reached the window. Over a paper backdrop a dark page reads 0.8 × `#121110` + 0.2 × `#faf9f6` = `rgb(64,64,62)`.
- To see the window as it will look, put a fullscreen solid window underneath and composite with `xcompmgr -n`. A tk window does it without a WM: `r.overrideredirect(True); r.geometry('1400x900+0+0'); r.configure(bg='#c9c3ba')`. `xsetroot -solid` is not enough once xcompmgr runs, and `xdotool` has no `windowlower`, so map the backdrop first.
- Drag check: `xdotool mousemove --sync 660 110; mousedown 1; xdotool mousemove_relative --sync 12 8` five times, `mouseup 1`, then `getwindowgeometry` — the window must move by exactly the sum. Repeat from a dot: the window must not move, which proves the buttons stay interactive.
- Minimize and zoom need a window manager; under Xvfb the geometry does not change. Report them unchecked.
- A product screenshot of a translucent window: set the backdrop to the page colour, so the crop's background equals the paper. Any other backdrop tints the whole window.
