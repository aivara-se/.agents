---
name: coding
description: Code quality rules a formatter cannot enforce — structure, dependencies, scripts, error handling, public surface, and the checks to run before calling a change done.
when-to-use: Any change to source code, or to the build and CI definitions around it. Read it before writing the first line, not after.
---

# Coding

Style is the language's own business: run the formatter and linter this repository already uses and do not argue with them. This skill covers what they cannot decide.

## The task and the spec

- Build the behaviour the specification states. Where two of its own numbers cannot both hold — a cap and a floor that collide, a minimum gap equal to a budget — satisfy the measurable acceptance criterion, take the rest as far as it goes, and say plainly in the change what you chose and why.
- **Never** choose between two readings of a specification in silence. The reviewer sees the code but not the reading you dropped, so the choice belongs in the change.

## Structure and size

- One responsibility per function, module and file. Prefer small, single-purpose units that return early over deep nesting.
- **Never** leave dead code: no commented-out blocks, no unreachable branches, no unused exports, no TODO without a name attached. The history is in git; delete rather than comment out.
- YAGNI before DRY: do not invent an abstraction until the third real copy exists. Two similar blocks with different reasons to change are allowed to stay similar.
- A file that needs a table of contents wants splitting; a function that needs a comment to explain its middle wants extracting.

## Dependencies

- The standard library or the runtime first. Every new dependency is a maintenance and supply-chain cost: justify it in the pull request body or do not add it.
- **Never** add a second package manager, a second lockfile, a second formatter, or a second test runner. The toolchain is the one the repository already uses.
- Dependencies are added for a reason that is written down, and pinned by the lockfile that the repository already commits.

## Scripts

- **A development-flow script is a Bun script.** Something that runs commands — a check, a build, a release, a data fix — is written in TypeScript and run with `bun run scripts/<name>.ts`, in the repository's own `scripts/` directory. **Never** Python. Prefer it over a bash shell script: past a handful of lines a shell script has no types, no argument handling and no error handling, and it fails differently on the next machine. A command typed at the prompt is not a script.
- A script is code and gets the same treatment as the rest of the change: fail loudly when it cannot do its job, no silent fallback, no secret printed, and any argument it needs named where the command is written down.
- **Never** leave a script that only one run needed. If it was a one-off, it was a command.

## Errors and data

- Fail explicitly. No silent fallbacks, no defaults that hide a missing required input, no catching an error only to log and continue.
- Validate at the boundary — user input, network, filesystem, environment — and trust the data inside the boundary.
- Error messages name the thing that failed and what was expected; they do not name the user's mistake in a way that blames them.
- **Never** log, print, commit or paste a secret, token, credential or personal datum — not truncated, not hashed-for-debugging, not in a test fixture.

## Public surface

- Keep the public API as small as it can be: private by default, public where another module genuinely needs it.
- Changing an existing public interface is a decision, not an edit. Say who consumes it and why the change cannot be additive.
- Every function, method, class and constant carries a block comment above it: what it is for, and anything the signature cannot say.
- **Never** a JSDoc block — no `@param`, `@returns`, `@typedef`. Types are the type system's job: in TypeScript the signature already is the type, and a JSDoc block only repeats it in prose and drifts from it.

## Pre-Completion Verification

Before you call a change done:

1. Run the formatter and linter this repository already uses — clean, with no suppressions you added for this change.
2. Run the checks this repository gates on, on the final tree — the whole sequence, not just the fast one.
3. Read the diff once, top to bottom, as the reviewer will: no debug output, no stray files, no unrelated reformatting, no scope the task did not ask for.
4. Re-read the change's own description — the pull-request body — against the final tree. It is a claim about the code, and a reviewer reads it before the diff, so a body that still names a module the change deleted, or reports a count of checks that has since moved, is a defect of the change and not a stale nicety. Grep the repository for the names the change removed and fix every hit.
