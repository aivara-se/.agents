# Service worker: offline without serving a stale copy

The shell is precached so the app opens with the network off. The failure that costs time is the returning device: it keeps the copy it cached, and a fix never reaches it.

## The rules

- **Cache-first with a named cache.** Precache the shell list in `install`, answer a cache hit first in `fetch`. Bump the cache name **in the same commit** as any change to a shell file or the list — a stale name is exactly how a device keeps the old file.
- **Precache past the HTTP cache.** `cache.addAll(SHELL.map((url) => new Request(url, { cache: "reload" })))`. Without `cache: "reload"` the new cache can be filled from the HTTP cache with files that are already stale.
- **Re-check the worker off the HTTP cache.** Register with `{ updateViaCache: "none" }` and call `await registration.update()` on load. The default can answer the update check from the HTTP cache, so the browser never notices the new `sw.js`.
- **Move the open pages onto the new worker.** In `activate`, if an older cache existed (this install replaces one), reload each window client after claiming: `for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url)`. Without it a returning device needs two manual reloads; with it, one reload and a few seconds.
- **Never precache `sw.js` itself.**

## The bump is the part that gets missed

A change that edits only a shell file — a stylesheet, a module, the shell list's
contents — leaves `sw.js` byte-identical. The browser then has nothing new to
install, never re-checks, and serves what it cached, with no error and no
symptom on the device. Nothing catches it but the habit, and a stylesheet-only
change is exactly the shape that slips through.

Before calling a change done, `git diff --stat` the shell files and confirm
`CACHE` moved in the same commit. A version that stayed put while a shell file
changed is the bug, and it is invisible in every fresh-profile check.

## The check that catches it

A fresh browser always passes — it has no old cache. Reproduce the returning visitor: launch Playwright with a persistent profile, load the old version until its worker is active, copy the new version over it, reload once, then poll what the server actually serves for a changed file (e.g. read `styles.css` and look for the marker) for several seconds. It should flip onto the new version without a second manual reload.
