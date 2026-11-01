# Verifying a built tinyjs app headless

A green `bun test` and a finished `tinyjs build` say nothing about the app. Run the binary and read the data it leaves.

## Dependencies

- `apt install libwebkit2gtk-4.1-0`, then `curl -fsSL https://tinyjs.app/install | TINYJS_NO_MODIFY_PATH=1 sh`. The installer refuses without WebKitGTK.
- The launcher needs `libayatana-appindicator3-1`. Without it the app exits 127 and the backend reports `launcher exited before connecting`. `ldd dist/launcher | grep "not found"` must be empty.
- `apt install xdotool strace imagemagick` gives typing, syscalls and screenshots.

## Run and drive it

- `Xvfb :99 -screen 0 1280x900x24 &`, then `DISPLAY=:99 XDG_DATA_HOME=<dir> ./dist/<name>`. The second variable keeps the run's data out of your home.
- No CDP: the page is a WebKitGTK view. `xdotool search --name "<Title>"`, then `xdotool windowfocus --sync <id>` and `xdotool type --window <id> "text"`. A page that sets its own title shows as `<Title> — <that title>`, so read `getwindowname` to confirm what rendered.
- No window manager runs, so `windowactivate` fails with `_NET_ACTIVE_WINDOW`. Use `windowfocus`, and pass `--window` to `xdotool type`.
- Read the result where the app wrote it: `$XDG_DATA_HOME/<app id>/` holds the database beside tinyjs's own files (`store.json`, `hsts-storage.sqlite`, salts). A fresh sqlite reader works while the app runs.
- Screenshot what only the page can say: `import -window root /tmp/shot.png`, downscale, read. That is how a fatal screen's message is checked.

## What to prove

- Type, wait past the debounce, read the row: whole body, right day, right counter.
- Quit and reopen: the text returns, and a cleared day comes back empty and unmarked.
- Corrupt the database before a launch: the app must name the file and leave it byte-identical. `sha256sum` before and after.
- No network: `timeout 25 strace -f -e trace=connect -o /tmp/net.trace ./dist/<name>`, type during the run, then `grep AF_INET /tmp/net.trace`. Every connection is `AF_UNIX` (dbus, X); one `AF_INET` is the finding. `unshare -n` is usually refused in a sandbox container.
- Single instance: launch twice. tinyjs exits the second, so one process survives `pgrep -x <name>`.

## Pitfalls

- Re-focus before every interaction. A key that lands without X focus leaves the page's focus state stale, so a page that fades on `document.hasFocus()` shows no pixel change and looks like a bug.
- Measure a fade instead of eyeballing it: sample the luminance with the caret in the faded input and again after blur, against `opacity*ink + (1-opacity)*paper`. 0.25 over a 199 paper and a 35 ink reads 158.
- `pkill -f "dist/pereda"` matches the shell wrapper that contains the command and kills the session. Use `pkill -x <name>`.
- The launcher writes a `.desktop` file and devices into the data folder. Clean `$XDG_DATA_HOME/<id>` between runs.

## A released macOS archive, without a Mac

A shipped `.app` will not run in a Linux sandbox, but it can be read — which proves whether a feature is in the build at all.

- `curl -fsSL -o p.zip <release asset>`, then `unzip -q p.zip`. `Contents/MacOS/` holds the launcher and the bundled `tjs`; `Contents/Resources/app/` holds the backend and page as built.
- Grep the shipped JS for the handler, the menu labels and the instruction text. The tagged asset and `git show origin/main:` can differ, and the asset is what the person downloaded.
- Prove a capability is linked, not merely named: `strings -a Contents/MacOS/<name> | grep -i FoundationModels` prints the framework path and Swift symbols only when the launcher carries the shim. Without it every Mac answers `'unsupported'` — the feature is dead in the build, not on the machine.
- `Contents/Info.plist` and `_CodeSignature/` confirm identity and signing. Notarization needs `spctl -a -vv` on a Mac.
