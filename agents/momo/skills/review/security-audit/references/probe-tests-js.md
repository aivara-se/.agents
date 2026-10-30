# Probe tests: a JavaScript backend on a local runtime

For a desktop or embedded app whose backend inherits full process privilege — a
tinyjs app (txiki.js backend, system webview page, one SQLite file). The page is a
trust boundary: it holds no authority, and the backend must refuse what the page
sends. The store file is the second boundary: it is the person's, they may edit it
in any SQLite tool, and a restore copies one in.

Probes live in the scratch copy (`~/scratch/<agent>/<repo>-sec/probes`) and import
the real modules. The clone stays clean.

## Run the real handlers under bun

The backend imports the platform (`import { Database } from 'tjs:sqlite'`), which bun
has no module for. Swap it once, then import the real entry file — the handler and
its validation run unchanged.

```js
// harness.js
import { mock } from 'bun:test';
import { Database } from 'bun:sqlite';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';

mock.module('tjs:sqlite', () => ({ Database }));

export async function loadApi() {
  const { api } = await import('../src/backend/main.js');
  const data = mkdtempSync(join(tmpdir(), 'probe-'));
  const app = { paths: async () => ({ data }) };   // the handle the handlers receive
  return { api, app, data, dbPath: join(data, 'app.db') };
}
```

`mock.module` must run before the dynamic `import`; a static import at the top of the
probe file is hoisted and fails on the platform specifier.

Under bun a handler throws a real `Error`, while the platform rejects the page's
promise with the message as a **plain string** (`catch (msg)` sees the text, never
`.message`). Print `String(e.message ?? e)`, or the evidence line carries a stack
frame instead of the sentence the app shows.

## What to send the write path

The backend's own validation is the first thing to exhaust: a non-string body, a
counter that is not a safe integer or is below 1, an impossible date, a day after
today, `undefined`, `null`, a number where a string belongs.

Then the encodings a store cannot round-trip. A save that is verified by re-reading
the row ("applied" only when the stored body equals the sent one) fails on any value
the store normalises, and the caller reports it as a failed or foreign write.

| body | survives SQLite TEXT? |
| --- | --- |
| `'a\uD800b'` (unpaired surrogate) | no — stored as U+FFFD |
| `'a\u0000b'` | yes |
| `'a😀b'` (astral pair) | yes |
| `'a\r\nb'` | yes |
| `'e\u0301'` (combining) | yes |
| `'a\u202Eb'` (RTL override) | yes |

Keep the controls: they are what turns "strings break the store" into "unpaired
surrogates break the store". Same-key retries measure nothing — an upsert guard
(`WHERE excluded.seq > stored.seq`) drops every repeat.

## Claim against bytes: the corrupt file

When the product promises a refused database is left alone, hash it, diff every byte
and list the directory before and after the open call.

```js
const before = readFileSync(path);            // sha256 + statSync().mtimeMs
writeFileSync(path, corruptCopy);             // damage a data page, keep page 1
const after = readFileSync(path);
const diff = [...before].map((b, i) => b !== after[i] && `${i}:${b.toString(16)}->${after[i].toString(16)}`).filter(Boolean);
// also readdirSync(dir) — a -wal and -shm beside the file is a write
```

A journal-mode switch executed before the integrity check rewrites header bytes 18
and 19 and the change counter at 24-27, and leaves sidecars. That is the evidence for
"the screen says the file was not changed". Re-run the same probe after moving the
switch below the check: byte-identical, no sidecars, and the fix is proven.

## Keys the store never validated on read

Rows written by another tool carry whatever key that tool wrote. Read paths usually
validate the *parameter* (a page cursor) but not the *row*. Plant rows in the file
and walk the read path the page walks:

```js
ins.run('2026-02-30', 'a row another tool wrote');   // impossible date, sorts between 02-29 and 03-01
db.close();
const page = await api.openLog({}, app);              // does the handler return it?
await api.openLog({ before: page.days.at(-1).day }, app);  // and accept it back as a cursor?
```

Position the bad row as the **last entry of a page** to test the boundary refusal
(the page sends its last day back as a cursor); a bad row mid-page only mis-renders.
Check the label the page draws for it: a rolled-over `new Date(y, m, d)` shows a
different date than the key, which is a finding in itself.

## The page

Note text reaches the DOM through `textContent`, `value` and `setAttribute`, or
through markup — `innerHTML`, `insertAdjacentHTML`, `document.write`, `eval`,
`new Function`. Grep for the second set and read the render function; a store file
another tool wrote is untrusted input to it, so a body carrying `<img onerror>` must
be displayed as text.

## The gate

`bun test` covers a backend's pure modules. `tinyjs build` needs the platform binary
and a webview, so a pass that could not build says so in the scope line rather than
claiming a green gate. An unproven reachability path — what a foreign origin in the
webview could call, what drag-and-drop loads — goes in the report as one labelled
line, never as a finding.
