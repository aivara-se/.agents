# Changing an installed app's device storage

A shipped offline app keeps its content and the visitor's data on the device (IndexedDB rows, a stored choice). When the change reshapes that data, the device already holds the old shape, and a fresh profile proves only first run.

## The seed

- **Version the seed, not the database.** Compare a `seeded` value in the meta store on every open; bump it when the shipped files change. The content changed, not the schema; a version bump drags a migration behind it.
- **A seed that only puts rows leaves orphans.** Delete every held id the new index does not name, or they show in whatever lists everything held.
- **Never ship over the user's own row.** Read it first in its own transaction and skip the shipped copy when it exists; restore is `clear()` then `seed()`, so the seed must create it when absent.
- **Never `await` between requests in one IndexedDB transaction.** It auto-commits with no pending request, so an awaited read between two writes ends it and the writes vanish without error. Read first, then issue every put/delete synchronously in one `readwrite` transaction.
- **Renaming an object store is a migration**: a version bump and a copy of every row. When the rename buys nothing, keep the old name and write the reason at the constant.

## Writing the user's edit back

- **Hand the store plain data, never Svelte's reactive state.** A value read from `$state` is a proxy, and `put` rejects it with `DataCloneError` — the page has redrawn, so it looks applied and is gone on the next load. Snapshot with `$state.snapshot(value)` in the component, so the store stays framework-free. An empty list clones fine, so a one-item test passes: exercise two edits, reload, read both back.

## The choice outside the database

- **A stored choice is keyed by version, and the key moves when its meaning does.** Ids read into a new type find a valid-but-wrong default instead of failing.
- **Read it defensively:** use the stored value only when the app still knows it, else the first option the caller passes — the read happens before the data loads.

## Proof

- **Write the old shape from the page, reload, read it back.** Rows the new build ships present, removed ids gone, the user's row intact, the new seed version. Write through the app's own UI, not by poking IndexedDB: that path is what exercises the clone boundary.
- Both passes run through CDP: `page-geometry-cdp` has the key events and the in-page `indexedDB.open` → `getAll()` read, wrapped in `new Promise` with `awaitPromise: true`.
- Then the gate on the final tree, and the artifact served as production serves it: storage is what unit tests cannot reach.
