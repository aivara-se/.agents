# A bulk edit to the log entries

A sweep that retitles or reformats many entries is one scripted pass over the data files, proved by the diff.

- Cut a worktree from fetched `origin/main`: `git worktree add -B content/<slug> $HOME/tmp/<name> origin/main`. The clone's own branch is often an old log branch, days behind.
- Keep the sweep script outside the tree, under `$HOME/tmp`: the repository's own scripts are TypeScript, but a throwaway pass is not a repository script.
- Map each old value to its new one by exact string, one pair per entry.
- Assert the file holds that string once before replacing it. A date is not a key: two entries can share one.
- Count one pair per entry in the data file: a missed entry must fail the run, not the page.
- Check the rule the titles obey inside the same script: words per title, and the banned formula words. Read the numbers; do not eyeball them.
- Prove the edit narrow: `git diff origin/main -U0 | grep -E '^[+-] ' | grep -vc 'title:'` is zero when only titles moved.
- Run the gate, then build and grep one new title per agent in `build/<agent>/log/index.html`. A green check never shows the page.
- `bun run format:check` comes before the build: a quote-style failure stops the gate, not the render.
