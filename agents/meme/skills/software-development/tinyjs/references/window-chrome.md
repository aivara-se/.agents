# Frameless and translucent windows

The window is the page: no title bar, controls drawn in HTML, and the page's own colour painted at partial alpha over a vibrancy material.

## Configure

- Set it in `tinyjs.json` under `chrome`, never only at runtime: `{ "frame": false, "windowControls": false, "transparent": true, "vibrancy": "sidebar" }`. `setChrome()` after the first paint flashes the default title bar for a frame; the config key is what ships.
- `frame: false` keeps native resize edges and focus. On Linux tinyjs adds 5px grips on all eight edges; `data-tiny-noresize` on `<html>` drops them, and a window you want to drag from the very top edge keeps them.
- Vibrancy is macOS and Windows only (Windows 11 maps `hud`/`popover`/`menu` to Acrylic, others to Mica); Linux ignores it and shows the bare alpha. The blur therefore cannot be checked on a Linux build — say so rather than claiming it.
- Prefer a material name spelled identically on every implementation (`sidebar`, `hud`, `popover`, `menu`) over a normalised one (`underwindow`, `underpage`). The docs normalise names, an unknown name fails silently as "no material", and the platform that would reveal it is the one you cannot build here.
- `macos`/`windows`/`linux` blocks merge onto the root object, so a per-OS `chrome` keeps the root's `frame` and overrides only the field it names.

## Page shape

- One alpha token for the window, one opaque token for surfaces that must not show the desktop:
  `--window: rgba(250,249,246,0.8)` (dark `rgba(18,17,16,0.8)`) on `body`, and keep `--bg` solid for the status pill and the error sheet. A pill over running text needs the opaque colour to stay legible.
- The bar is a flex sibling above the app container: `body { display:flex; flex-direction:column }`, `.app { flex:1; min-height:0 }`, `.bar { flex:none; height:44px }`. Leaving `height:100%` on the container pushes the bar off screen or double-counts it.
- `data-tiny-drag` on the bar. Buttons, links, inputs and textareas inside it stay interactive and a double click zooms — no JS needed for either.
- Keep the bar out of any container an error state hides, and inset a full-window error overlay below it (`inset: var(--bar) 0 0`). A frameless window whose app has failed but whose close button is hidden cannot be closed.
- Remove chrome that existed only because controls floated over the content: a fade under floating buttons is stale once the buttons sit in a bar, and so is their `position: fixed`.

## Controls

- `tiny.win.close()` on the main window quits the app. Await the app's flush first, so an in-page close keeps the same promise a quit does; do not block the close on a failed save, which would trap the person in a window that will not shut.
- `tiny.win.minimize()` and `tiny.win.zoom()` are the other two; `tiny.win.onState(fn)` when the dots should reflect focus, minimize or maximize.
- 26px hit target, 11px dot on `::before` with `background: currentColor`, the colour on the button — one rule per dot, no SVG.

## Prove the alpha headless

- `import -window <id>` flattens a transparent window over black, so it cannot show the real composite. Capture the root and crop the rect read from `xdotool getwindowgeometry` in the same run: `import -window root -crop 1080x720+160+90 +repage shot.png`.
- The arithmetic is the proof. Over a black root the page reads 0.8 × its colour, so `#faf9f6` gives `rgb(200,199,197)`; a value equal to the solid colour means transparency never reached the window. Over a paper backdrop a dark page reads 0.8 × `#121110` + 0.2 × `#faf9f6` = `rgb(64,64,62)`.
- To see the window as it will look, put a fullscreen solid window underneath and composite with `xcompmgr -n` (`apt-get install -y xcompmgr`). A tk window does it without a WM: `r.overrideredirect(True); r.geometry('1400x900+0+0'); r.configure(bg='#c9c3ba')`. `xsetroot -solid` is not enough once xcompmgr runs — the root reads back mid-grey — and `xdotool` has no `windowlower` (`Unknown command`), so map the backdrop first and launch the app after it.
- Drag check with the app running: `xdotool mousemove --sync 660 110; mousedown 1; xdotool mousemove_relative --sync 12 8` five times, `mouseup 1`, then `getwindowgeometry` — the window must move by exactly the sum. Repeat the drag from a dot: the window must not move, which is what proves the buttons stay interactive.
- Minimize and zoom need a window manager; under Xvfb the geometry does not change. Report them unchecked instead of guessing.
- A product screenshot of a translucent window: set the backdrop to the page colour, so the crop's background equals the paper and the image keeps its flat look. Any other backdrop tints the whole window and the shot stops matching the app.
