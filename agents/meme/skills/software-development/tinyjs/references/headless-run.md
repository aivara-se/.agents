# Running a tinyjs app without a desktop

## Start

- `Xvfb :99 -screen 0 1400x900x24 -nolisten tcp`.
- Build, then `DISPLAY=:99 ./dist/<app>`. Wait about seven seconds; the window appears before the page paints. `tinyjs dev` is for hot reload only — hand checks use the built binary.

## Find and drive

- `xdotool search --name <Title> | tail -1` gives the window id, `getwindowgeometry <id>` its position and size. `search` also matches tooltips and popups that inherit the name, so pick the id whose geometry is the shipping window.
- `xdotool getwindowpid <id>`, then `/proc/<pid>/cmdline`, names the binary and the launcher's arguments (`… <page> <socket> <title> <WxH> <version>`). Read it before blaming the UI: a stale build answers `search` too and shows the old version here.
- Click at window position + content offset, read off the capture you just took: a bar or a toolbar row moves every target down, and a click into the gap hits nothing while the page keeps its old focus.
- On Linux the runtime's menu bar is inside the window geometry: a 720 px page reports 745, and `xdotool --window` coordinates include it. Add its height when translating a page position.
- Confirm a click by the state it changes — the row that moved, the query that appeared, the row in the database — never by the absence of an error.
- Prefer keyboard: `xdotool type --delay 20 'text'`, `xdotool key Return`, `ctrl+a`. After clicking a control, wait ~1 s for the backend round trip.

## Capture

- `import -window <id> /root/scratch/shot.png` — never crop the root by a remembered offset: without a window manager the window moves between launches and the crop adds a black edge.
- A transparent or frameless window is the exception: `import -window` flattens it over black, so capture `-window root` and crop the rect `getwindowgeometry` reported in the same run.
- A native dialog is a separate window, so `import -window <app>` misses it. Capture the root when one is expected, and wrap `import` in `timeout 5`; a stale id can hang the X connection.
- Look at the capture. A serif read as sans, or a black strip, means the crop or the window is wrong.
- For a README image: stop the app, back up the data folder, seed three or four short notes, relaunch, click the page background to drop the caret, capture to `docs/screenshot.png`.
- For a page-only image, set the root to a paper colour (`xsetroot -solid '#e9e5dd'`) so the 80% paper composites as over a desktop, and crop `pageW x pageH + windowX + (windowY + menu)`.
- The overlay scroll indicator outlives a capture taken right after a scroll: wait about five seconds with no input. It shows as a 3 px column of `rgb(236,235,232)` two pixels from the right edge, so scan the saved file's columns.

## Read the state

- Linux data folder: `~/.local/share/<id>/`; macOS `~/Library/Application Support/<id>/`; Windows `%APPDATA%\<id>\`.
- Read the SQLite file while the app runs: WAL lets a second reader in. `python3 - <<'EOF'` with `sqlite3.connect(path)` and `select day, seq, body from notes`.
- Reset for a first-run check only with the app stopped: remove the data folder, relaunch, type.

## Stop cleanly

- List the real processes: `ps ax -o pid=,args= | grep -E "[d]ist/<app>|[l]auncher-linux|[t]js run"` and `kill` those pids.
- Never `pkill -f` or `grep | kill` on a pattern that appears elsewhere in the command: the tool wraps it in a `bash -c` line, so the shell matches too and the call returns 143 having killed itself. `[d]ist` does not save you when another argument in the same command (`/root/scratch/<app>`) matches. Take the pid from `xdotool getwindowpid <id>` or `/proc`; in Python skip the `bash -c source /tmp/hermes-snap` wrapper.
- The launcher and `tjs` children outlive the terminal wrapper. Kill them before relaunching, or the single-instance lock raises the old window and the new process exits 0.
