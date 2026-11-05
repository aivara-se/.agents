# Rolling a formatter across the repositories

Run it as one change per repository, all from `origin/main`.

1. Read each repository's `validate.yml` from `origin/main`, not from the working tree: a stale clone hides a gate that already exists. `gh repo list <owner>` gives the set; `.template` sets what a new repository inherits.
2. Put the config at the root as the one reference file, and pin the version once. Repos that already carry the config keep their extra options.
3. A Svelte repo needs no `prettier-plugin-svelte`: `bun fmt` parses `.svelte` itself, while no Prettier or oxfmt config exists.
4. A Prettier config switches `bun fmt` to emulation, and every `.svelte` file is then skipped in silence. In directory mode the check still exits 0.
5. Keep the style in `bunfig.toml` under `[fmt]`: `printWidth`, `proseWrap`, and the like.
6. Prove the gap closed: `bun fmt --list-files .` names the components, and `bun fmt --list-different .` names nothing on a formatted tree.
7. A component dirtied on purpose makes `bun fmt --check .` exit 1.
8. Add the step to the job the default branch requires, before the tests, and name it after what it does (`Format`). Rename an existing same-named step (`Go format`) rather than leave two `Format` steps.
9. Run the check as `bun x <formatter>@<version> --check .`. It resolves from bun's cache, so a Go or docs repository gains no `package.json`, lockfile or second package manager. Repos that already install it use their own script.
10. For Bun's own formatter nothing is fetched. Pin the runtime in `setup-bun`, since `bun fmt` first ships in 1.4.4, and run `bun fmt --no-script --check .`.
11. Without `--no-script`, a `fmt` script in `package.json` receives the arguments. Then `fmt: prettier --write .` answers `--check` by rewriting the file and exiting 0.
12. Reformat the tree in the same pull request. Then confirm the check fails on a file you dirty on purpose; exit 1 is the proof.
13. Prove the change is style only: build the base in one worktree and the branch in another, then `diff -rq` the output trees. Only hashed asset names and collapsible whitespace may differ; any changed string or class is a real defect.
14. To answer "does it cover this class" without a new tool: `bun fmt --no-script --list-files . | grep -i '\.md$'`. Then dirty one file; `--check .` exits 1.
15. `bun fmt` lists Markdown in dot-directories (`.github/PULL_REQUEST_TEMPLATE.md`) and honours `proseWrap`. A line that stays long under `"never"` is not a missed file.
16. Read the step's history before proposing a second formatter: `git log -S prettier -- .github/workflows`. A swapped formatter leaves its config behind.
17. A table is aligned only when the aligned form fits `printWidth`. Prettier, and `bun fmt` under emulation, print it as written past that.
18. So one file holds a padded table and a tight one, and `--check` passes on both. Report drift only when `bun x prettier@<version> --check <file>` disagrees.
19. Table style follows the config: `.prettierrc.json` gives conditional alignment; `bunfig.toml [fmt]` alone pads every table.
20. A repository that ignores its docs (`prettierignore`) keeps the author's hand-padding. Read its config before comparing two repositories.

Expect two breakages. A test that reads its own source for a literal breaks when the quote style changes — match either quote. A hand-written `bun:test` type shim must declare any matcher a new assertion uses, or `svelte-check` fails while `bun test` passes.
