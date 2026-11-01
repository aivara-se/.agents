# Testing backend handlers under bun

Bun cannot resolve `tjs:*`, so a test that imports only `src/shared/` never loads the handler in `src/backend/main.js`.

## Load it

```js
import { beforeAll, mock } from "bun:test";

mock.module("tjs:sqlite", () => ({ Database: class {} }));

let api;
beforeAll(async () => {
  ({ api } = await import("../src/backend/main.js"));
});
```

That stub is enough when the handler never opens the store. When it does, use a real `bun:sqlite` `Database`, or stub `./store.js` and keep the SQL out of the test.

## Stub every tjs import

A new top-level `tjs:*` import breaks every test that imports `main.js`, so add its stub beside `tjs:sqlite`. Bun reports it as `Cannot find package` at the import, so run that one test file.

```js
mock.module("tjs:path", () => ({
  default: { join: (...parts) => parts.join("/") },
}));
```

## Keep the filesystem loop testable

Take the target path and writer as arguments: `writeExport(rows, target, writeFile)`, with `target` the backend's `(day) => join(folder, day + '.md')`. Bun passes a fake writer and pins the order, the bytes and the first failure. Validate the day before the path is built, so a hand-edited row cannot escape the folder.

## Prove it on the real runtime

Bun never executes a `tjs:*` module, so a green unit test leaves the import shape and the write unproven. Run the module under the runtime:

```sh
~/.tinyjs/bin/tjs run /root/scratch/check.js
```

The CLI needs `run`; a bare path prints the help. Read the files back with `od -c`: a trailing newline or a changed byte fails the write.

## Fake the app handle

Pass only what the branch reads:

```js
const app = {
  system: { os: () => "macos" },
  macos: {
    ai: { availability: async () => "available", generate: async () => "text" },
  },
  store: {
    get: async (key) => (key === "assistant" ? true : null),
    set: async () => true,
  },
};
```

Test each branch: success, refusal, empty input, and a second call while the first is in flight. Assert the value that crossed the boundary, not that a function was called.

## Module state

Module state (`opening`, `registering`, a `generating` flag) is shared by every test in the file. Declare it beside the store promise: an assigned but undeclared flag is a `ReferenceError`. Release the concurrent case's gate before the next test, or the flag leaks.

## Hooks

`init(app)`, `onMenu(id, app)`, `onHotkey` and `onWindowState` are exports, not `api`: call them with the fake app. A menu-only test proves the menu shape, not that its handler runs.
