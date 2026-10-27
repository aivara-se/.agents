---
name: coding
description: Code rules a formatter cannot enforce — the spec, structure, dependencies, errors, the public surface, and the pull request.
when-to-use: Any change to source code or to the build and CI around it, before the first line.
---

# Coding

Style is the formatter's job: run the one this repository uses and do not argue with it.

## The task

- Build the smallest thing the task asks for. A gap you can name is a fact about this version: name it in the body.
- A rare case needing a new concept is not a requirement. Record it, unless an ordinary caller reaches it and it throws or corrupts.
- A merged design outranks the code: implement to it, and name the documents you left unedited.
- Never choose between two readings in silence: say which you took, and why.
- Frozen documents: a contradiction is a blocker. Name the file, the line and the input that settles it, in one question.
- Sync the base branch, and read the tree before assuming another agent landed it.
- Build in the order the architecture document numbers; the reviewer compares against it.
- An ADR's overrides clause is a deletion list. Read the old ADR beside the new.
- Reuse the service's vocabulary: a new outcome is a value in the existing field unless the design says otherwise.
- A change wider than its ask: `references/hidden-scope.md`.

## Structure

- One responsibility per function, module and file. Return early rather than nest.
- No dead code, unused export or unnamed TODO. Git is the history.
- YAGNI before DRY: the third copy earns the abstraction; two blocks differing only in a constant are one function with a parameter.
- A table of contents means splitting; a mid-way comment means extracting.
- When a new flow joins a handler, walk every piece of state it touches, decide per piece, and pin it with a test.
- A condition covering a class the switch handles makes later branches dead: fold the old target in first and test each one.

## Dependencies and scripts

- Standard library first. A dependency is a cost: justify it in the body or do not add it.
- Never a second package manager, lockfile, formatter or test runner.
- A script that runs commands is TypeScript: `bun run scripts/<name>.ts`. Never Python or shell; a prompt command is not a script.
- A script fails loudly, prints no secret, and names its arguments where the command is written. Delete a one-off.

## Errors and data

- Fail explicitly: no silent fallback, no default hiding a missing input, no catch that only logs.
- Validate at the boundary — input, network, filesystem, environment — and trust what is inside.
- An error names what failed and what was expected, without blaming the reader.
- Never log, print or commit a secret, a token or personal data, not even truncated or in a fixture.

## Public surface

- Private by default. Changing a public interface is a decision: say who consumes it and why.
- Every function, class and constant carries a block comment: what it is for, what the signature cannot say.
- Never a JSDoc block. Types are the type system's job.

## The pull request

- One version, one pull request, one branch, merged bottom-up.
- Read `gh pr view <n> --json state` before pushing. Auto-merge can land it while you edit; a push after `MERGED` leaves a commit no pull request carries — open a new one for what remains.
- Always `--reviewer thani-sh`, plus one peer:
  - MaMa — product, architecture, an interface, a costly reversal
  - MeMe — code that has to last · MiMi — a measured change or a new tool
  - MoMo — untrusted input, shared state, security, parsing
- Arm it as you open it: `gh pr merge <n> --auto --rebase`. Never arm a draft or a spike.
- The body is `writing`'s shape, never a file list.

## After a review

- A request for changes is a proposal: is it true, in scope, worth its cost? If not, answer on the thread.
- When it holds, apply it and ask that reviewer again.
- A push re-runs the gate and dismisses approvals; rebase as the base moves, then re-request.

## Done

1. Formatter and linter clean, and the whole gate ran on the final tree.
2. Read the diff as the reviewer will; take out what the task did not ask for.
3. A fix is the smallest diff that removes the cause — not a check, a guard or a script.
