# A notes store on tjs:sqlite

## Schema

```sql
CREATE TABLE notes (
  day  TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  seq  INTEGER NOT NULL
) WITHOUT ROWID;
```

One row per local day. A cleared day keeps its row with an empty body; every read filters `body <> ''`.

## Open

- `import { Database } from 'tjs:sqlite'`; `new Database(path)` is synchronous, so `await` only the folder.
- `PRAGMA journal_mode = WAL`, then `PRAGMA synchronous = FULL`.
- `PRAGMA integrity_check` must return `ok`; a failure refuses the app and names the file, it never recreates it.
- `PRAGMA user_version` is the schema version. Create the table and set the version in one `BEGIN; …; COMMIT;`, so a crash cannot leave a version-0 file with the table present.

## Write

```sql
INSERT INTO notes (day, body, seq) VALUES (?, ?, ?)
ON CONFLICT(day) DO UPDATE SET body = excluded.body, seq = excluded.seq
WHERE excluded.seq > notes.seq
```

- `stmt.run` returns nothing; read the row back and report `applied` only when `row.seq === seq && row.body === body`.
- That body comparison is what catches a second window writing at the same counter and reporting a save it did not make.

## Test under bun

- Keep the store in a module that takes the open handle: `openStore(path, (p) => new Database(p))`.
- `bun:sqlite` implements the same API: `openStore(':memory:', (p) => new Database(p))` runs the real statements.
- Pin: insert, update, stale counter, same-counter different body, tombstone kept, no resurrection, schema version, corrupt file untouched.
