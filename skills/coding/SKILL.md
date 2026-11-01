---
name: coding
description: The decisions a formatter cannot enforce — the spec, dependencies, the public surface, and the pull request.
when-to-use: Any change to source code or to the build and CI around it, before the first line.
---

# Coding

Run the repository's formatter and accept its output.

## The task

- Build the smallest thing the task asks for. Name a gap you leave in the body.
- A rare case that needs a new concept is not a requirement. Record it, unless a normal caller hits it and it throws.
- A merged design outranks the code: implement it, and name the documents you left unedited.
- Never pick between two readings in silence. Say which you took, and why.
- A frozen document that contradicts the task is a blocker. Name the file, the line and the input, in one question.
- A merged ADR that assumes a missing capability is the operator's call. Name the ADR, the platform and the options; do not build the surface.
- Sync the base branch with `git pull --ff-only`, then read the tree before you assume another agent landed it.
- Cut the work branch from `origin/main` in a fresh worktree. An existing clone may sit on another agent's branch with unlanded work.
- Never run `git checkout origin/main -- .`: it dirties the index while HEAD stays behind.
- Build in the order the architecture document numbers. The reviewer compares against it.
- Reuse the service's vocabulary. A new outcome is a value in the existing field unless the design says otherwise.
- A change wider than its ask: `references/hidden-scope.md`.

## Structure

- YAGNI before DRY. The third copy earns the abstraction; two blocks that differ in one constant are one function with a parameter.
- When a new flow joins a handler, walk every piece of state it touches, decide per piece, and pin it with a test.
- A condition that covers a class the switch handles makes the later branches dead. Fold the old target in first, and test each one.

## Dependencies and scripts

- A dependency is a cost. Justify it in the body or do not add it.
- Never a second package manager, lockfile, formatter or test runner.
- A script that runs commands is TypeScript at `scripts/<name>.ts`, run with `bun`. Never Python or shell.
- A script names its arguments where the command is written, and prints no secret.

## Errors and data

- Fail explicitly. No silent fallback, and no catch that only logs.
- Validate at the boundary, and trust what is inside.
- Never log, print or commit a secret, a token or personal data, not even truncated or in a fixture.

## Public surface

- Private by default. Changing a public interface is a decision: say who consumes it and why.
- Every function, class and constant carries a block comment: what it is for, and what the signature cannot say.
- Never a JSDoc block. Types are the type system's job.

## The pull request

- One version, one pull request, one branch, merged bottom-up.
- Read `gh pr view <n> --json state` before you push. Auto-merge can land it while you edit.
- A push after `MERGED` carries no pull request. Open a new one for what remains.
- Ask `thani-sh` and one peer whose role owns the risk: MaMa architecture, MeMe durability, MiMi a measurement, MoMo untrusted input.
- Confirm the request landed: `gh pr view <n> --json reviewRequests`. A login that does not exist is dropped in silence; add it with `gh pr edit --add-reviewer`.
- Read the reviews before you report done. A request for changes is the next step.
- Arm it as you open it: `gh pr merge <n> --auto --rebase`. Never arm a draft or a spike.
- A stacked pull request is never armed. Merge it with `gh api -X PUT repos/<owner>/<repo>/pulls/<n>/merge-async -f sha=<head> -f merge_method=rebase`, then poll its `uuid`.
- The body follows `writing`, and is never a file list.

## After a review

- A request for changes is a proposal. Ask whether it is true, in scope, and worth the cost. If not, answer on the thread.
- When it holds, apply it and ask that reviewer again.
- A push re-runs the gate and drops approvals. Rebase as the base moves, then re-request.
- An approval on a head a rebase replaced is gone. Re-apply it and ask again: an approval belongs to a commit, not a branch.
- A rebase that meets another agent's doc commit conflicts on summaries, not facts. Keep their new bullets, and recount any number.
- A rebase against a revert keeps the revert. Keep only the lines your change still owns.

## Done

1. The formatter, linter and whole gate are clean on the final tree.
2. Read the diff as the reviewer will, and take out what the task did not ask for.
3. A fix is the smallest diff that removes the cause, not a guard around it.
