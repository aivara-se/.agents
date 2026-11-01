# Testing backend handlers under bun

`src/backend/main.js` imports its `tjs:*` modules at the top (`tjs:sqlite`, and later `tjs:path` or `tjs:fs`). Bun cannot resolve them, so a test that imports only `src/shared/` never loads the handler.

## Load it

```js
import { beforeAll, mock } from 'bun:test';

mock.module('tjs:sqlite', () => ({ Database: class {} }));

let api;
beforeAll(async () => {
  ({ api } = await import('../src/backend/main.js'));
});
```

The stub is enough when the handler does not open the store. A handler that does needs a real `bun:sqlite` `Database`, or stub `./store.js` instead and keep the SQL out of the test.

## Stub every tjs import

A new top-level `tjs:*` import in `main.js` breaks every test that imports it. Add its stub beside `tjs:sqlite` in each such file. Bun reports the failure as an unnamed test with `Cannot find package` at the import, so run the one test file, not only the suite's tail.

```js
mock.module('tjs:path', () => ({ default: { join: (...parts) => parts.join('/') } }));
```

## Keep the filesystem loop testable

Take the target path and writer as arguments: `writeExport(rows, target, writeFile)`, with `target` the backend's `(day) => join(folder, day + '.md')`. Bun passes a fake writer and pins the order, the exact bytes and the first failure; the backend supplies `tjs:path` and `tjs.writeFile`. Validate the day before the path is built, so a hand-edited row cannot escape the folder.

## Prove the module on the real runtime

Bun never executes a `tjs:*` module, so a green unit test leaves the import shape and the write unproven. Run the module under the runtime:

```sh
~/.tinyjs/bin/tjs run /root/scratch/check.js
```

The CLI needs the `run` subcommand; a bare path prints the help. The script imports the module, passes `tjs.writeFile`, and prints its result. Read the files back with `od -c`: a trailing newline or a changed byte is a failed verbatim write. This covers `tjs:path`'s join, UTF-8 and the overwrite without an app or a native dialog.

## Fake the app handle

Pass only what the branch reads:

```js
const app = {
  system: { os: () => 'macos' },
  macos: { ai: { availability: async () => 'available', generate: async () => 'text' } },
  store: { get: async (key) => (key === 'assistant' ? true : null), set: async () => true },
};
```

Test each branch: success, a refusal, the empty input, and the second call while the first is in flight. Assert the value that crossed the boundary, not that a function was called: the prompt is the note, the reply is returned, the second call throws.

## Module state

Module state (`opening`, `registering`, a `generating` flag) is shared by every test in the file. Declare it beside the store promise; a flag assigned but never declared is a `ReferenceError` under strict module semantics. Run the concurrent case in one test and release its gate before the next test, or the flag leaks.

## Hooks

`init(app)`, `onMenu(id, app)`, `onHotkey`, and `onWindowState` are exports, not part of `api`: call them directly with the fake app. A menu-only test proves the menu shape, not that the handler behind it runs.
