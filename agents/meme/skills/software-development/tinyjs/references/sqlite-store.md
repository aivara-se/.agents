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

## Search over the bodies

- FTS5 is in the runtime's SQLite on all three platforms. A separate table in the same file, `day` unindexed so a match joins back to `notes`:

```sql
CREATE VIRTUAL TABLE notes_fts USING fts5(
  day UNINDEXED,
  body,
  tokenize="unicode61 remove_diacritics 0"
);
CREATE TRIGGER notes_insert AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts (day, body) VALUES (new.day, new.body);
END;
CREATE TRIGGER notes_update AFTER UPDATE ON notes BEGIN
  DELETE FROM notes_fts WHERE day = old.day;
  INSERT INTO notes_fts (day, body) VALUES (new.day, new.body);
END;
CREATE TRIGGER notes_delete AFTER DELETE ON notes BEGIN
  DELETE FROM notes_fts WHERE day = old.day;
END;
```

- `remove_diacritics 0` keeps å, ä and ö as their own letters while still folding case in every script; `LIKE` and `lower()` fold only A–Z, so "Äpple" is missed by "äpple".
- No external-content mode: `notes` is `WITHOUT ROWID`, and FTS5 maps external rows by rowid. The index is a copy, about a third of the file for ordinary notes.
- Lift an older file in one transaction: create the table and triggers, `INSERT INTO notes_fts (day, body) SELECT day, body FROM notes;`, then set `user_version`. Creating and filling in separate transactions leaves a file whose index is short of its notes.

## A query is words

- Build the MATCH expression by quoting each word and appending `*`: `"appl"*` is a prefix phrase, and doubling any `"` inside the word (`word.replaceAll('"', '""')`) keeps it literal. Joining with a space ANDs the words in any order.
- Drop a word with no letter or number (`/[\p{L}\p{N}]/u`): a phrase of only punctuation is a syntax error, and nothing would match it anyway.
- Never interpolate the person's text into SQL or into the query language; the quoting above is the whole defence.
- `SELECT notes.day, snippet(notes_fts, 1, '', '', '…', 12) FROM notes_fts JOIN notes ON notes.day = notes_fts.day WHERE notes_fts MATCH ? ORDER BY notes.day DESC LIMIT ?` — the row is read from `notes`, so a stale index cannot invent a day.

## Test under bun

- Keep the store in a module that takes the open handle: `openStore(path, (p) => new Database(p))`.
- `bun:sqlite` implements the same API: `openStore(':memory:', (p) => new Database(p))` runs the real statements.
- Prove the triggers by saving through the store, never by inserting into `notes_fts` yourself: the insert you write is not the one the app performs.
- Pin: insert, update, stale counter, same-counter different body, tombstone kept, no resurrection, schema version, corrupt file untouched; then a folded non-ASCII match both ways (`äpp` and `ÄPP`), a near miss (`hjart` does not find `hjärta`), prefix, two words in either order, an update and a clear removing the old text, the result cap, and an older file lifted with its notes searchable.
