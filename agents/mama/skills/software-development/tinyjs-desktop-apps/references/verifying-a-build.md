# Verifying a built tinyjs app headless

A green `bun test` and a finished `tinyjs build` say nothing about the app. Run the built binary and read the data it leaves.

## Dependencies

- The installer refuses to run without WebKitGTK: `apt install libwebkit2gtk-4.1-0`, then `curl -fsSL https://tinyjs.app/install | TINYJS_NO_MODIFY_PATH=1 sh`.
- Without `libayatana-appindicator3-1` the app exits 127 with `error while loading shared libraries`, and the backend reports `launcher exited before connecting`. `ldd dist/launcher | grep "not found"` must be empty.
- `apt install xdotool strace imagemagick` gives typing, syscalls and screenshots.

## Run and drive it

- `Xvfb :99 -screen 0 1280x900x24 &`, then `DISPLAY=:99 XDG_DATA_HOME=<dir> ./dist/<name>` — the second variable keeps the run's data out of your home.
- There is no CDP; the page is a WebKitGTK view. Use `xdotool windowfocus --sync <id>`, then `xdotool type --window <id> "text"`. Find the window with `xdotool search --name "<Title>"`; a page that sets its own title shows as `<Title> — <that title>`, so read `getwindowname`.
- No window manager runs, so `windowactivate` fails with `_NET_ACTIVE_WINDOW`: use `windowfocus` and pass `--window` to `xdotool type`.
- Read the result where the app wrote it, not on screen: `$XDG_DATA_HOME/<app id>/` holds its database beside tinyjs's own files (`store.json`, `hsts-storage.sqlite`, salts). A fresh sqlite reader works while the app runs.
- For anything only the page can say, take `import -window root /tmp/shot.png`, downscale and read it — that is how a fatal screen's message or a marked calendar gets checked.

## What to prove

- Type, wait past the debounce, read the row: whole body, right day, right counter.
- Quit and reopen: the text returns, and a cleared day comes back empty and unmarked.
- Corrupt the database before a launch: the app must name the file and leave it byte-identical — `sha256sum` before and after.
- No network: `timeout 25 strace -f -e trace=connect -o /tmp/net.trace ./dist/<name>`, type during the run, then `grep AF_INET /tmp/net.trace`. Everything is `AF_UNIX` (dbus, X); one `AF_INET` is the finding. `unshare -n` is usually not permitted in a sandbox container.
- Single instance: launch twice; only one process survives `pgrep -x <name>`.

## Pitfalls

- **Re-focus before every interaction, not once per run.** A click or key that lands while the window has no X focus leaves the page's focus state stale, so a page that fades on `document.hasFocus()` shows no pixel change. `xdotool windowfocus <id>`, then click, then screenshot.
- **Measure a fade instead of eyeballing it.** Sample a control's luminance with the caret in the faded-away input, and again after blur, then compare against `opacity*ink + (1-opacity)*paper` — 0.25 over a 199 paper and a 35 ink reads 158.
- **`pkill -f "dist/pereda"` matches the shell wrapper that contains the command and kills the session.** Use `pkill -x <name>`.
- **The launcher writes a `.desktop` file and devices into the data folder.** Clean the whole `$XDG_DATA_HOME/<id>` between runs to start from an empty app.
