# Service worker: offline without serving a stale copy

The shell is precached so the app opens with the network off. The failure that costs time is the returning device: it keeps the copy it cached, so a fix never reaches it.

## The rules

- **Cache-first with a named cache.** Precache the shell list in `install`, answer a cache hit first in `fetch`. Bump the cache name **in the same commit** as any change to a shell file or the list — a stale name is how a device keeps the old file.
- **Precache past the HTTP cache.** `cache.addAll(SHELL.map((url) => new Request(url, { cache: "reload" })))`, or the new cache fills from the HTTP cache with files already stale.
- **Re-check the worker off the HTTP cache.** Register with `{ updateViaCache: "none" }` and call `await registration.update()` on load; the default answers from the HTTP cache, so the browser never notices the new `sw.js`.
- **Move the open pages onto the new worker.** In `activate`, if an older cache existed, reload each window client after claiming: `for (const client of await self.clients.matchAll({ type: "window" })) client.navigate(client.url)`. Without it a returning device needs two manual reloads.
- **Never precache `sw.js` itself.**

## The bump is the part that gets missed

A change to only a shell file leaves `sw.js` byte-identical. The browser has nothing to install, never re-checks, and serves what it cached, with no error and no symptom on the device. Before calling it done, `git diff --stat` the shell files and confirm `CACHE` moved in the same commit.

## The check that catches it

A fresh browser always passes. Reproduce the returning visitor: launch Playwright with a persistent profile, load the old version until its worker is active, copy the new version over it, reload once, then poll what the server serves for a changed file (read `styles.css` for the marker) for several seconds. It should flip without a second manual reload.
