# Verifying a built tinyjs app headless

A green `bun test` and a finished `tinyjs build` say nothing about the app. Run the built binary and read the data it leaves.

## Dependencies

- The installer refuses to run without WebKitGTK: `apt install libwebkit2gtk-4.1-0`, then `curl -fsSL https://tinyjs.app/install | TINYJS_NO_MODIFY_PATH=1 sh`.
- The launcher needs `libayatana-appindicator3-1`; without it the app exits 127 with `error while loading shared libraries` and the backend reports `launcher exited before connecting`. `ldd dist/launcher | grep "not found"` must be empty.
- `apt install xdotool strace imagemagick` gives typing, syscalls and screenshots.

## Run and drive it

- `Xvfb :99 -screen 0 1280x900x24 &`, then `DISPLAY=:99 XDG_DATA_HOME=<dir> ./dist/<name>` — the second variable keeps the run's data out of your home.
- There is no CDP: the page is a WebKitGTK view. Drive it with `xdotool windowfocus --sync <id>` then `xdotool type --window <id> "text"`. Find the window with `xdotool search --name "<Title>"`; a page that sets its own title shows as `<Title> — <that title>`, so read `getwindowname` to confirm what the page rendered.
- No window manager is running, so `windowactivate` fails with `_NET_ACTIVE_WINDOW`: use `windowfocus`, and pass `--window` to `xdotool type` rather than relying on focus.
- Read the result where the app wrote it, not on screen: `$XDG_DATA_HOME/<app id>/` holds the app's database beside tinyjs's own files (`store.json`, `hsts-storage.sqlite`, salts). A fresh sqlite reader works while the app runs.
- Take a screenshot for anything only the page can say: `import -window root /tmp/shot.png`, downscale, and read it. That is how a fatal screen's message and a marked or unmarked calendar get checked.

## What to prove

- Type, wait past the debounce, and read the row: whole body, right day, right counter.
- Quit and reopen: the text returns, and a cleared day comes back empty and unmarked.
- Corrupt the database before a launch: the app must name the file and leave it byte-identical — `sha256sum` before and after.
- No network: `timeout 25 strace -f -e trace=connect -o /tmp/net.trace ./dist/<name>`, type during the run, then `grep AF_INET /tmp/net.trace`. Every connection an app like this makes is `AF_UNIX` (dbus, X); one `AF_INET` is the finding. `unshare -n` is usually not permitted in a sandbox container.
- Single instance: launch twice; tinyjs exits the second one, so only one process survives `pgrep -x <name>`.

## Pitfalls

- `pkill -f "dist/pereda"` matches the shell wrapper that contains the command and kills the session. Use `pkill -x <name>`.
- The launcher writes a `.desktop` file and devices into the data folder: clean the whole `$XDG_DATA_HOME/<id>` between runs to start from an empty app.
