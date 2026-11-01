# One global hotkey

## Wiring

- In `init(app)`, ask `app.system.capabilities()` first: `globalHotkeys === false` means a Wayland desktop without the GlobalShortcuts portal, where the combo can never fire. Then `app.hotkey.register(id, combo)`.
- Keep the promise in a module variable and answer the page through an api call: registration happens once per process, so a page that asks before `init` ran gets that promise, not a second registration.
- `onHotkey(id, app)` calls `app.win.show()`; the page's `tiny.hotkey.on((id) => …)` runs the app's normal path. A press reaches both, so the shortcut behaves like the button it mirrors.
- `cmd+shift+k` is ⌘⇧K on macOS and Ctrl+Shift+K elsewhere. Name it with `tiny.system.os()`, or the person reads a key that is not on their keyboard.
- Registering an id twice replaces its combo; hotkeys last until the app quits; the backend has no `on` — presses arrive through the hook.

## Proving the press under Xvfb

- `Xvfb :99 -screen 0 1400x900x24`; build, `DISPLAY=:99 ./dist/<app> &`, wait about 9 seconds.
- Put another window in front: `DISPLAY=:99 xmessage -buttons OK -center hi &`, `xdotool windowfocus <id>`, and check `getwindowfocus` names it.
- `xdotool key --clearmodifiers ctrl+shift+d`: the launcher grabs the key on the root window, so it fires even while another client has focus. `getwindowfocus` naming the app is the show.
- Type without clicking and read the SQLite file: the characters must land where the shortcut's path put the caret — proof the press ran the behaviour, not only the focus call.

## Proving the refusal

- Hold the combo in a second client first: `pip install python-xlib`, then keep this process alive.

```python
from Xlib import X, XK, display
d = display.Display(':99'); root = d.screen().root
code = d.keysym_to_keycode(XK.string_to_keysym('d'))
for extra in (0, X.LockMask, X.Mod2Mask, X.LockMask | X.Mod2Mask):
    root.grab_key(code, X.ControlMask | X.ShiftMask | extra, True,
                  X.GrabModeAsync, X.GrabModeAsync)
d.sync()
```

- Read the app's stdout: `tinyjs: hotkey "cmd+shift+d" not registered: the system refused it (another app may hold it)`, and `register()` resolves false. Capture the page's notice.
- All four lock-modifier variants matter: without them the combo passes whenever Caps Lock or Num Lock is on.
