---
name: testing
description: What to test, where the tests live, how to run them, and what makes a test worth keeping.
when-to-use: Any change that adds or alters behaviour, any bug fix, and any change something else depends on. A behaviour change with no test is unfinished work.
---

# Testing

## What to write

- Every behaviour change gets a test that fails before the change and passes after it. For a bug fix, write the failing test first and keep it — the bug is not fixed if nothing would catch it coming back.
- Cover the happy path, the validation or error path, and at least one boundary: empty, maximum, malformed, duplicated.
- Test the contract, not the implementation: given this input, this output or this failure. A test that breaks when the internals are refactored is testing the wrong thing.
- Prefer parameterised or table-driven cases over copy-pasted blocks — one case per line, with the expectation visible.
- **Never** write a test that can pass for the wrong reason: no assertions that a call happened without checking what it returned, no `assert True`, no snapshot nobody reads.
- **A dedupe test repeats an entry the other filters keep.** When a flow wakes each named target once, repeating the actor pins the actor rule, not the dedupe: the actor is removed from every copy before the seen-check runs, so deleting the dedupe stays green. Repeat a non-actor, configured target instead and assert one run — with the dedupe gone that fixture starts two.
- **A list of candidates is pinned with two valid entries.** When the payload carries several candidates and the specification names one — the first pull request of a run — give the fixture two and assert the named one; a fixture with a single entry cannot tell first from last.
- **A fixture that invents an identifier breaks when validation starts cross-checking a second table.** The moment the parser requires the entry to name an existing page, route or entity, the generic `'example'` fixture is invalid for the right reason. Move it to a real key and add one negative case that pins the new rejection; do not weaken the check to keep the fixture.
- **A value the provider computes is captured, never invented.** An association, a permission, a normalised name: a fixture that sets it to what it *should* be proves only that the code reads the field. A guard fed a plausible invented value passes the suite and refuses every real payload, and the surface can be dead for months while its tests are green. Copy one real payload — a captured delivery, an exported response — and name where it came from. When the value decides who may act, also pin what happens when the provider reports a different value for the same account on another surface.
- **When the repository hand-writes its test-framework types, use the matchers those declarations carry.** A shim that declares only `toBe`, `toEqual`, `toThrow`, `toHaveLength` and `toContain` makes `toBeDefined` and `toBeGreaterThan` a type error, and widening the shim is a change to a shared harness rather than a test. Express the same claim with what is declared — `expect(x.length > 0).toBe(true)` — and leave the shim alone.
- **A compound filter is pinned one clause at a time.** When a delivery acts only if several conditions all hold — event, action, review state, pull-request state, draft, a null field — give every clause its own case that differs only in that clause. A happy path plus one negative case leaves every other clause free to be deleted without a test going red, which is exactly what a mutation-based review probes for.
- **Prove each clause by deleting it.** Before calling a clause covered, replace it with `true`/`false`/`""`, run the case, and confirm it goes red. A table with one row per clause does not prove the rows disagree with the code. Two deletions pass silently: an earlier branch of the same decision wins the visible outcome, so the deleted clause only changes a counter — pin it with a budget test; and the fixture never reaches the guarded path — a dedupe needs the same identifier injected from both sources to be reachable at all.
- **A record's serialized shape is pinned by marshalling it, not by struct equality.** A field with `omitempty` disappears from the JSON and reappears whenever it is set, so comparing structs cannot see it; unmarshal the line into a map and assert the key set for every kind of line the writer produces.
- **A stub that invokes a completion callback inline reorders the writes a real asynchronous worker makes.** Indexing the output lines in such a test fails on the stub's order, or passes while the real order differs; find each record by a field only its kind carries (an error code, a status) instead.
- **A cap is four tests, not one.** The limit-th delivery wakes, the next is refused, a delivery of the same kind that wakes nobody spends nothing from the budget, and each cap leaves any other cap on the same repository and number untouched in both directions. Without the third, moving the advance ahead of the match passes; without the fourth, wiring two caps to one counter passes.
- **Pin a "must not use" guard by driving the shared state to its limit.** When a new flow shares a handler with an existing counter or cache but must ignore it, test the case at the limit — the counter maxed for the same key, the id already cached — because a test below the limit passes when the guard is deleted.
- Deterministic above all: no wall-clock time, no randomness, no network, no dependence on file ordering or locale. Inject or freeze what you cannot control.
- Fast and local: mock the network and filesystem boundaries instead of calling them. A suite nobody runs is a suite that rots.

## Where they live

- Follow the placement convention the repository already uses; if it has none, put the test next to the code it verifies and say so in the pull request.
- Test data belongs with the test, named for the case it covers. Do not commit a fixture that another test would silently depend on.
- A harness that is code is code: written in the repository's own language and run with its package manager, not as a shell script of commands.

## Running them

- **Find out what this repository runs before you run anything.** There is no fixed shape and no fixed number: a repository may have one narrow test command, one gate that runs everything, a sequence of steps with no wrapper, or nothing at all. Read its manifest, its `scripts/`, its CI file and the instructions it already carries, and adapt to what is actually there — this skill deliberately names no command, because it cannot know.
- **Before a full handover, follow the same steps that validating a pull request follows** — the same commands, in the same order, on the tree the reviewer will get. Start narrow while you iterate; finish with everything the repository gates on, and read each result rather than the last exit code alone.
- Quote the command and the tree it ran against. A report without either is a claim, not a verification.
- If the repository has no test command at all, or has one that nothing runs — not your loop, not CI — say that in the handoff instead of claiming coverage.
- A test that passes only sometimes is a broken test. Fix it or delete it in the same change — **never** retry until green, and never mark a flaky test as expected failure to get past a gate.
- A web front-end is checked in a real browser, not only in unit tests: `references/browser-checks.md` has the recipe — serve from the check script, drive Chromium with Playwright, measure in the page.
