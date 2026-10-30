# Changing an installed app's device storage

A shipped offline app keeps its content and the visitor's own data on the device
(IndexedDB rows, a `localStorage` choice). When the change reshapes that data — a
new pack shape, merged rows, a renamed key — the device already holds the old
shape, and a fresh profile proves only first run. These are the rules that keep
the operator's data across the change.

## The seed

- **Version the seed, not the database.** Compare a `seeded` value in the meta store
  on every open; bump it when the shipped files change. A schema change is not what
  happened — the content did — and a DB version bump drags a migration behind it.
- **A seed that only puts rows leaves orphans.** Delete every held id the new index
  does not name. Otherwise rows the app no longer ships keep showing in whatever
  surface lists "everything held" (a settings page, a picker), and they are invisible
  to a first run.
- **Never ship over the user's own row.** Read it first, in its own transaction, and
  skip the shipped copy when it exists; the shipped file is the empty starting point,
  not the truth. Restore is `clear()` then `seed()`, so the seed must create that row
  when it is absent — after a clear it is, and that is the one case the shipped copy
  should land.
- **Never `await` between requests inside one IndexedDB transaction.** It auto-commits
  once it has no pending request, so an awaited read between two writes ends the
  transaction and the later writes vanish with no error. Do all reads first (each in
  its own transaction), then open one `readwrite` transaction and issue every
  put/delete synchronously; settle the promise on `transaction.oncomplete`.
- **Renaming an object store is a migration, not an edit.** It needs a DB version
  bump plus a copy of every row. When the rename buys nothing, keep the store's old
  name and write the reason at the constant ("renaming it would need a migration that
  moves every parent's word").

## Writing the user's edit back

- **Hand the store plain data, never the framework's reactive state.** In Svelte 5 a
  value read out of `$state` is a proxy, and IndexedDB refuses to clone one: `put`
  rejects with `DataCloneError`. The page has usually already redrawn from the same
  value, so the change looks applied and is gone on the next load; if the app catches
  the rejection to show "the device would not keep that change", that message is the
  only sign. Snapshot at the boundary — `$state.snapshot(value)` — and keep the
  snapshot call in the component, not in the store, so the store stays framework-free.
- **A one-item test hides it.** A list holding nothing proxied (an empty array of
  rows) clones fine, so the first add succeeds and the second fails: exercise two
  edits in the same pass, reload, and read both back.

## The choice kept outside the database

- **A stored choice is keyed by version, and the key moves when its meaning does.** A
  set of enabled list ids that becomes one language id, an array that becomes a
  string: holding the old key means an old value is read into the new type, which
  usually finds a valid-but-wrong default instead of failing. New meaning, new key.
- **Read it defensively:** use the stored value only when the app still knows it,
  otherwise the first option the caller passes. The caller passes what it knows
  because the read happens before the data has loaded.

## Proof

- **Write the old shape into the device from the page, reload, read it back.** The
  rows the new build ships present, the removed ids gone, the user's row and its
  words intact, the seed version the new one. A clean profile only ever exercises
  first run, and first run is the case that was already working.
- **Do the writes through the app's own UI where the flow allows it**, not by poking
  IndexedDB from the check: the UI path is what exercises the clone boundary above,
  and a check that writes rows itself proves the schema, not the app.
- Both passes run through CDP: `page-geometry-cdp` has the real key events and the
  in-page `indexedDB.open` → `getAll()` read, wrapped in `new Promise` with
  `awaitPromise: true`.
- Then the repository's own gate on the final tree, and the built artifact served the
  way production serves it — the storage path is the one thing unit tests cannot reach.
