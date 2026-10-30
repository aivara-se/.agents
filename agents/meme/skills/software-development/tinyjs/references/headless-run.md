# Running a tinyjs app without a desktop

## Start

- Start a display once: `Xvfb :99 -screen 0 1400x900x24 -nolisten tcp`.
- Build first (`tinyjs build`) and run the built binary with `DISPLAY=:99 ./dist/<app>`. Wait about seven seconds before the first capture; the window appears before the page paints.
- Use `tinyjs dev` for hot reload only. The built binary is what ships, so hand checks use it.

## Find and drive

- `xdotool search --name <Title> | tail -1` gives the window id; `xdotool getwindowgeometry <id>` gives its position and size. `search` also matches tooltips and popups that inherit the app's name — pick the id whose geometry is the shipping window, not simply the last one.
- `xdotool getwindowpid <id>` then `/proc/<pid>/cmdline` names the binary behind the window and the arguments the launcher was given (`… <page> <socket> <title> <WxH> <version>`). Read it before blaming the UI: a stale build left running answers `search` just as readily and shows the old version here.
- Click with window position + content offset. Prefer keyboard: `xdotool type --delay 20 'text'`, `xdotool key Return`, `xdotool key ctrl+a`.
- After clicking a control, wait ~1 s for the backend round trip before typing.

## Capture

- `import -window <id> /root/scratch/shot.png` — never crop the root by a remembered offset. Without a window manager the window moves between launches (160→100), and the crop silently adds a black edge.
- A transparent or frameless window is the exception: `import -window` flattens it over black, so capture `-window root` and crop the rect that `xdotool getwindowgeometry` reported in the same run. The saved pixels are then the composite the compositor shows, which is what the alpha has to be read from.
- A native dialog (`confirm`, `alert`, a folder picker) is a separate window, so `import -window <app>` misses it. Capture `-window root` when a dialog is expected, and wrap `import` in `timeout 5`; a stale id can hang the X connection.
- Look at the capture. A serif read as sans, or a black strip, means the crop or the window is wrong, not the UI.
- For a README image, stop the app, back up the data folder, seed a fresh database with three or four short notes, relaunch, click the page background to drop the caret, then capture the window and save it as `docs/screenshot.png`.
- The overlay scroll indicator outlives a capture taken right after a scroll or a click: wait about five seconds with no input, then capture. A page that always scrolls shows it as a 3 px column of `rgb(236,235,232)` two pixels in from the right edge, so scan the saved file's columns, not the screen — it reads as plain margin to the eye.

## Read the state

- Linux data folder: `~/.local/share/<id>/`; macOS `~/Library/Application Support/<id>/`; Windows `%APPDATA%\<id>\`.
- Read the SQLite file while the app runs: WAL lets a second reader open it. `python3 - <<'EOF'` with `sqlite3.connect(path)` and `select day, seq, body from notes`.
- Reset for a first-run check only with the app stopped: remove the data folder, relaunch, then type.

## Stop cleanly

- List the real processes: `ps ax -o pid=,args= | grep -E "[d]ist/<app>|[l]auncher-linux|[t]js run"` and `kill` those pids.
- Never `pkill -f`, or a `grep | kill`, on a pattern that appears anywhere else in the command you are typing: the tool wraps the whole command in a `bash -c` line, so the shell that runs it matches too and the call returns 143 having killed itself mid-way. The bracket trick (`[d]ist`) only stops a pattern matching its own text — a path or another argument in the same command (`/root/scratch/<app>`) still matches. Take the pid from `xdotool getwindowpid <id>` or from `/proc`, and when filtering in Python skip the `bash -c source /tmp/hermes-snap` wrapper.
- The launcher and `tjs` children outlive the terminal wrapper. Kill them before relaunching; otherwise the single-instance lock raises the old window and the new process exits 0.
