# One global hotkey

## Wiring

- Backend `init(app)`: ask `app.system.capabilities()` first — `globalHotkeys === false` means a Linux Wayland desktop without the GlobalShortcuts portal, where the combo can never fire. Otherwise `app.hotkey.register(id, combo)`.
- Keep the promise in a module variable and hand the answer to the page through an api call. Registration happens once per process, so a page that asks before `init` ran must get the same promise, not a second registration.
- Backend `onHotkey(id, app)` calls `app.win.show()`; the page's `tiny.hotkey.on((id) => …)` runs the app's normal path. A press reaches both, so the shortcut behaves exactly like the button it mirrors.
- `cmd+shift+k` is ⌘⇧K on macOS and Ctrl+Shift+K on Windows and Linux. Name the combo in the UI with `tiny.system.os()` or the person reads a key that is not on their keyboard.
- Registering an id twice replaces its combo; hotkeys last until the app quits; the backend has no `on` — presses arrive through the hook.

## Proving the press under Xvfb

- `Xvfb :99 -screen 0 1400x900x24`; build, then `DISPLAY=:99 ./dist/<app> &`; wait about 9 seconds.
- Put another window in front: `DISPLAY=:99 xmessage -buttons OK -center hi &`, `xdotool windowfocus <id>`, and check `xdotool getwindowfocus` names it.
- `xdotool key --clearmodifiers ctrl+shift+d`: the launcher grabs the key on the root window, so it intercepts the press even though another client has focus. Read `xdotool getwindowfocus` after it — the app's window id is the show.
- Then type without clicking and read the SQLite file: the characters must land where the shortcut's path put the caret. That is the proof the press ran the app's behaviour, not only its focus call.

## Proving the refusal

- Hold the combo in a second client first, so the app cannot take it: `pip install python-xlib`, then keep this process alive.

```python
from Xlib import X, XK, display
d = display.Display(':99'); root = d.screen().root
code = d.keysym_to_keycode(XK.string_to_keysym('d'))
for extra in (0, X.LockMask, X.Mod2Mask, X.LockMask | X.Mod2Mask):
    root.grab_key(code, X.ControlMask | X.ShiftMask | extra, True,
                  X.GrabModeAsync, X.GrabModeAsync)
d.sync()
```

- Launch the app and read its stdout: `tinyjs: hotkey "cmd+shift+d" not registered: the system refused it (another app may hold it)`, and `register()` resolves false. The page's notice is then on screen; capture the window and read it.
- All four lock-modifier variants matter: a grab without them lets the combo through whenever Caps Lock or Num Lock is on.
