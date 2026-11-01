---
name: framework-major-migration
description: "Use when upgrading to a new major framework version."
version: 1.0.0
author: MiMi (thani-sh-mimi)
license: MIT
when-to-use: The app must move to a new MAJOR version of its framework or build tool — the version where config moves, aliases or module names are renamed, or runtime floors rise (SvelteKit, Svelte, Vite, Next). Run the official codemod first, finish by hand, verify with the repo's gate and a real runtime check.
metadata:
  hermes:
    tags:
      [
        migration,
        upgrade,
        framework,
        codemod,
        sveltekit,
        dependencies,
        breaking-changes,
      ]
    category: software-development
    related_skills:
      [change-planning, github, testing, web-frontend-delivery, coding]
---

# Framework major-version migration

Run the official migration, finish what it left, prove the app still behaves, and keep the diff to config, imports and module names.

## When to use

- Moving an app to a new major of its framework or build tool, where configuration, aliases, module paths or minimum runtime versions change.
- Not a minor or patch bump — that is update, install, run the gate.
- Not a codebase-internal rename — that is `terminology-rename`.

## The rule that carries the rest

**Never hand-port a major migration the project's own tooling performs.** Hand-porting misses the files you did not think to open. Run the codemod first and let its TODO list be your map: it is the framework authors' account of what cannot be automated safely.

## Order of work

1. **Branch first**, before running anything, so the migration is one revertable change. Never migrate on `main`.
2. **Read the migration guide, the changelog and the release/RC announcement before the codemod.** They name the removed options, renamed modules and minimum versions, and tell you what the codemod will leave behind.
3. **Be on the newest patch of the current major first** when more than one major behind: the latest of the old line emits deprecation warnings pointing at what to fix before the jump.
4. **Run the official codemod non-interactively.** For a task-based migrator:

   ```
   npx <cli> migrate <migration> --tasks all --confirm --install <your-package-manager>
   ```

   - `--tasks all` skips task selection; `--confirm` skips the final apply prompt.
   - `--confirm` does **not** cover the dirty-working-tree check or the dependency-install prompt: the tree must be clean and you must pass the install flag (or the no-install flag), or the run blocks on stdin.
   - The tool's advice is one task at a time (`--tasks <id>`, commit between) for a reviewable diff; `--tasks all` is for automation.

5. **Read the codemod's output, not just its exit code.**
   - It may run the project's `format`/`fmt` script over the tree (see pitfalls).
   - It writes un-automatable tasks to a generated instructions file (e.g. `MIGRATION_TASKS.md`) and leaves `@migration-task` comments. Grep for both, work them, then **delete the generated file**.
   - A task starting "if you rely on X" is often not applicable: decide, and say in the PR why it was skipped.
6. **Grep for everything the migration deprecated** — the old alias and module names the guide names.
7. **Run the repo's full gate sequence on the final tree**, then serve the built artifact the way production serves it and read a response. A green type-check and build are not evidence the page renders — see `web-frontend-delivery`.
8. **Open the PR with the migration in the body:** the exact codemod command, the tasks applied, what was verified and how, and every decision the codemod left to you. Request review from the operator and a peer (see `github`).

## Pitfalls

- **The codemod formats the whole tree with the project's own script, and a repo-wide `--write` rewrites files outside your diff** — including an instruction file you may not edit. Format only the files you changed afterwards (its format step can also fail if the formatter is unresolvable, leaving your files unformatted). If it rewrote a file you must not touch, restore it with git. The general rule — a pattern rewrite never clears a gate, and never route around a refusal — is in `web-frontend-delivery`.
- **A pre-existing red gate stays red; do not bundle its fix in.** Check the base branch before owning a failure and report it with its run link. A shared CI job is often sequential, so an early failure can hide the steps that would have exercised your change.
- **A document naming the old major version is a separate, operator-owned edit.** Propose the README/AGENTS line and wait; do not fold it into the migration PR.
- **Respect the version floors the guide states.** The codemod bumps `package.json`, but `engine-strict`, the CI matrix or the host runtime may still pin an older one.
- **A major bump is not a licence to change behaviour.** The diff is configuration, imports and module names; carry over an API rewrite the codemod could not decide as the smallest necessary change.
- **"All tasks applied successfully" is not done.** It means the rewriters ran; the gate sequence and the runtime check make the claim.

## References

- `references/sveltekit-3.md` — SvelteKit 2→3: the `sv migrate` command, its task list, the version floors, and the breaking changes to check for.
