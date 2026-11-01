# Rolling a formatter across the repositories

Run it as one change per repository, all from `origin/main`.

1. Read each repository's `validate.yml` from `origin/main`, not from the working tree: a stale clone hides a gate that already exists. `gh repo list <owner>` gives the set; `.template` sets what a new repository inherits.
2. Put the config at the root as the one reference file, and pin the version once. Repos that already carry the config keep their extra options.
3. A Svelte repo needs no `prettier-plugin-svelte`: `bun fmt` parses `.svelte` itself, while no Prettier or oxfmt config exists.
4. A Prettier config switches `bun fmt` to emulation, and every `.svelte` file is then skipped in silence. In directory mode the check still exits 0.
5. Keep the style in `bunfig.toml` under `[fmt]`: `printWidth`, `proseWrap`, and the like.
6. Prove the gap closed: `bun fmt --list-files .` names the components.
7. A component dirtied on purpose makes `bun fmt --check .` exit 1.
8. Add the step to the job the default branch requires, before the tests, and name it after what it does (`Format`). Rename an existing same-named step (`Go format`) rather than leave two `Format` steps.
9. Run the check as `bun x <formatter>@<version> --check .`. It resolves from bun's cache, so a Go or docs repository gains no `package.json`, lockfile or second package manager. Repos that already install it use their own script.
10. Reformat the tree in the same pull request. Then confirm the check fails on a file you dirty on purpose; exit 1 is the proof.
11. Prove the change is style only: build the base in one worktree and the branch in another, then `diff -rq` the output trees. Only hashed asset names and collapsible whitespace may differ; any changed string or class is a real defect.

Expect two breakages. A test that reads its own source for a literal breaks when the quote style changes — match either quote. A hand-written `bun:test` type shim must declare any matcher a new assertion uses, or `svelte-check` fails while `bun test` passes.
