---
name: testing
description: What to test, where the tests live, how to run them, and what makes a test worth keeping.
when-to-use: Any change that adds or alters behaviour, any bug fix, and any change something else depends on.
---

# Testing

## What to write

- Every behaviour change gets a test that fails before it and passes after.
- A bug fix starts with the failing test and keeps it.
- Cover the happy path, the error path and one boundary: empty, maximum, malformed, duplicated.
- An entry point that imports a platform module at the top is never run by a test of its pure neighbours. Stub the platform and drive the public call.
- Pin a compound filter one clause at a time. Replace each clause with `true` and watch the case fail.
- A dedupe test repeats a target the other filters keep. The actor is removed from every copy, so repeating it hides a deleted dedupe.
- Two candidates when the spec names one, or the fixture cannot tell first from last.
- Never invent a value the provider computes. Copy a captured payload.
- Pin a record's serialized shape by marshalling it: `omitempty` is invisible to struct equality.
- A cap is four tests: at the limit, past it, a delivery that spends nothing, and one cap not touching another.
- A flow that must ignore shared state is tested with that state at its limit.
- Three traps that green the suite and fail in production: `references/test-traps.md`.
- Deterministic: no clock, no randomness, no network, no file ordering, no locale.

## Where they live

- Follow the repository's convention. If it has none, put the test beside the code and say so in the body.
- A fixture is named for its case and lives with its test.
- A test name states the behaviour in Simplified Technical English.
- A harness is code in the repository's language, not a shell script of commands.

## Running them

- Find what this repository runs first: its manifest, `scripts/`, CI, its own instructions. This skill names no command because it cannot know.
- Before a handover, run the same commands in the same order on the tree the reviewer gets, and read each result.
- Quote the command and the tree. A report without both is a claim, not a verification.
- No test command, or one nothing runs? Say so in the handoff instead of claiming coverage.
- A test that passes only sometimes is broken. Fix or delete it in the same change. Never retry for green.
- Check a front end in a browser: `references/browser-checks.md`.
