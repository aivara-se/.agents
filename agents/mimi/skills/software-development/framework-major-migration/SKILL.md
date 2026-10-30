---
name: framework-major-migration
description: "Use when upgrading to a new major framework version."
version: 1.0.0
author: MiMi (thani-sh-mimi)
license: MIT
when-to-use: The app must move to a new MAJOR version of its framework or build tool — the version where config moves, aliases/module names are renamed, or runtime requirements rise (SvelteKit, Svelte, Vite, Next, and the like). Run the official codemod first, finish by hand, verify with the repo's gate and a real runtime check.
metadata:
  hermes:
    tags: [migration, upgrade, framework, codemod, sveltekit, dependencies, breaking-changes]
    category: software-development
    related_skills: [change-planning, github, testing, web-frontend-delivery, coding]
---

# Framework major-version migration

A major bump is where the framework's own tooling does most of the work and the
rest is judgement. The work is: run the official migration, finish what it left,
prove the app still behaves, and keep the diff to config, imports and module
names.

## When to use

- Moving an app to a new major version of its framework or build tool, where
  configuration, aliases, module paths or minimum runtime versions change.
- Not a minor or patch bump — that is just update, install, run the gate.
- Not a codebase-internal rename — that is `terminology-rename`.

## The rule that carries the rest

**Never hand-port a major migration the project's own tooling performs.** The
framework ships a codemod for exactly this, and hand-porting misses the files
you did not think to open. Run the codemod first and let its TODO list be your
map: it is the framework authors' own account of what cannot be automated
safely, and it is the shortest path to "done".

## Order of work

1. **Branch first.** Never migrate on `main`. Commit the branch before running
   anything, so the whole migration is one revertable change.
2. **Read the official migration guide and the changelog before running the
   codemod.** They name the removed options, the renamed modules and the
   minimum versions; the codemod only applies what it can match safely, and the
   guide tells you what it will leave. Also read the release/RC announcement
   when there is one — it lists the headline changes in a paragraph.
3. **Be on the newest patch of the current major first** when you are more than
   one major behind: the latest of the old line emits targeted deprecation
   warnings that point at what to fix before the jump.
4. **Run the official codemod non-interactively.** For a task-based migrator:

   ```
   npx <cli> migrate <migration> --tasks all --confirm --install <your-package-manager>
   ```

   - `--tasks all` skips task selection; `--confirm` skips the final apply
     prompt. Both are needed for a non-interactive run.
   - `--confirm` does **not** cover the dirty-working-tree check or the
     dependency-install prompt: the tree must be clean, and you must pass the
     install flag (or the no-install flag) or the run blocks on stdin.
   - The tool's own advice is one task at a time (`--tasks <id>`, commit
     between) for a reviewable diff; `--tasks all` is for automation or when a
     single combined diff is intended.
5. **Read the codemod's output, not just its exit code.**
   - It may run the project's `format`/`fmt` script over the tree when one
     exists (see pitfalls).
   - It writes its un-automatable tasks to a generated instructions file
     (e.g. `MIGRATION_TASKS.md`) and leaves `@migration-task` comments in the
     code. Grep for both, work them, then **delete the generated file** — it is
     scaffolding, not something to ship.
   - A listed task that begins "if you rely on X" is often not applicable here.
     Read it, decide, and say in the PR why it was skipped — do not leave it
     open or paste it into the repo.
6. **Grep for everything the migration deprecated** (the old alias and module
   names the guide names) to be sure the codemod left nothing behind.
7. **Run the repo's full gate sequence on the final tree**, then verify at
   runtime: a major version changes what the server produces, so serve the
   built artifact the way production serves it and read a response. A green
   type-check and build are not evidence the page renders — see
   `web-frontend-delivery`.
8. **Open the PR with the migration in the body:** the exact codemod command,
   the tasks it applied, what was verified and how, and every decision the
   codemod left to you. Request review from the operator and a peer (see
   `github`).

## Pitfalls

- **The codemod formats the whole tree with the project's own script, and a
  repo-wide `--write` rewrites files outside your diff** — including an
  instruction file you are not allowed to edit. After the migration, format
  only the files you changed (the codemod's own format step can also fail if
  the formatter is not resolvable in its shell, leaving your files unformatted).
  If it rewrote a file you must not touch, restore that file with git. The
  general rule — a pattern rewrite never clears a gate, and never route around
  a refusal — is in `web-frontend-delivery`.
- **A pre-existing red gate stays red; do not bundle its fix into the
  migration.** Check the base branch before owning a failure, and report it
  with its run link instead of absorbing it. A shared CI job is often
  sequential, so a pre-existing early failure can also hide the steps that
  would have exercised your change — say that plainly rather than implying CI
  covered it.
- **A document that names the old major version is a separate, operator-owned
  edit.** Do not fold a README/AGENTS version string into the migration PR;
  propose the line and wait.
- **Respect the version floors the guide states** (minimum Node, compiler, and
  tooling versions). The codemod bumps `package.json`, but the repo's
  `engine-strict`, CI matrix or host runtime may still pin an older one — check
  before claiming it installs.
- **A major bump is not a licence to change behaviour.** The diff should be
  configuration, imports and module names. Carry over any API rewrite the
  codemod could not decide as the smallest necessary change; nothing else.
- **Do not trust the codemod's "all tasks applied successfully" as done.** It
  means the rewriters ran, not that the app is correct: the gate sequence and
  the runtime check are what make the claim.

## References

- `references/sveltekit-3.md` — SvelteKit 2→3: the `sv migrate` command, its
  task list, the version floors, and the breaking changes to check for.
