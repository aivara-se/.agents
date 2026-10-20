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
- **When the code must read one of two fields that carry the same kind of value, plant a different valid value in the field that must be ignored** — another configured login ahead of the real one in an `assignees` array, say — so a mutation that reads the wrong field wakes the wrong target and the test fails, instead of passing because both fields happen to agree.
- **A list of candidates is pinned with two valid entries.** When the payload carries several candidates and the specification names one — the first pull request of a run — give the fixture two and assert the named one; a fixture with a single entry cannot tell first from last.
- **A cap is four tests, not one.** The limit-th delivery wakes, the next is refused, a delivery of the same kind that wakes nobody spends nothing from the budget, and each cap leaves any other cap on the same repository and number untouched in both directions. Without the third, moving the advance ahead of the match passes; without the fourth, wiring two caps to one counter passes.
- **Pin a "must not use" guard by driving the shared state to its limit.** When a new flow shares a handler with an existing counter or cache but must ignore it, test the case at the limit — the counter maxed for the same key, the id already cached — because a test below the limit passes when the guard is deleted.
- Deterministic above all: no wall-clock time, no randomness, no network, no dependence on file ordering or locale. Inject or freeze what you cannot control.
- Fast and local: mock the network and filesystem boundaries instead of calling them. A suite nobody runs is a suite that rots.

## Testing a spawned process

- Point the launcher at the test binary itself instead of writing a fake executable: configure the path as `os.Args[0]`, and in `TestMain` check an env var plus the first argument, write `os.Args[1:]` to a capture file and exit 0. A script fixture in `t.TempDir()` fails to exec where `TMPDIR` is mounted noexec, and re-exec needs no second toolchain. `flag.Parse` has not run when `TestMain` is called, so inspecting `os.Args` there is safe.
- Assert the whole argv — element count, each element, and a sentinel planted in every text field of the input that must appear in no element — because a substring check passes on an argument that carries the payload along with the reason.
- Poll for the capture file under a short bounded deadline; the child is asynchronous, and a fixed sleep is a flaky test.
- Drive the test through the boundary the process is called on (a signed HTTP request to the handler) and keep the decision function unexported; calling internals proves a branch, not the contract.
- For booting the finished binary and checking it answers, `references/process-and-server-checks.md` has the recipe.

## Where they live

- Follow the placement convention the repository already uses; if it has none, put the test next to the code it verifies and say so in the pull request.
- Test data belongs with the test, named for the case it covers. Do not commit a fixture that another test would silently depend on.
- When the only copy of a machine-readable shape lives in a document the repository ships — a README example, a spec block — have the test extract and load that document instead of restating it in a fixture: a duplicated fixture keeps passing while the document rots.
- A harness that is code is code: written in the repository's own language and run with its package manager, not as a shell script of commands.

## Running them

- **Find out what this repository runs before you run anything.** There is no fixed shape and no fixed number: a repository may have one narrow test command, one gate that runs everything, a sequence of steps with no wrapper, or nothing at all. Read its manifest, its `scripts/`, its CI file and the instructions it already carries, and adapt to what is actually there — this skill deliberately names no command, because it cannot know.
- **Before a full handover, follow the same steps that validating a pull request follows** — the same commands, in the same order, on the tree the reviewer will get. Start narrow while you iterate; finish with everything the repository gates on, and read each result rather than the last exit code alone.
- Quote the command and the tree it ran against. A report without either is a claim, not a verification.
- If the repository has no test command at all, or has one that nothing runs — not your loop, not CI — say that in the handoff instead of claiming coverage.
- A test that passes only sometimes is a broken test. Fix it or delete it in the same change — **never** retry until green, and never mark a flaky test as expected failure to get past a gate.
- A web front-end is checked in a real browser, not only in unit tests: `references/browser-checks.md` has the recipe — serve from the check script, drive Chromium with Playwright, measure in the page.
