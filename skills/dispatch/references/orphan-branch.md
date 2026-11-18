# A branch with no pull request

A branch that shares no history with `main` is a rewrite: it replaces the tree, and there is no diff to review.

- Diff it only against its merge base. `no merge base` from `git diff origin/main...origin/<branch>` confirms the orphan, so read the tree instead.
- Run the gate the branch runs, then the checks it omits. A `validate.yml` with only the document checker passes an edited `AGENTS.md`.
- Check the entry file with `bun run validate-agents --entry <path>`, against the canon at `aivara-se/.github/docs/ENTRY.md`.
- Report what the branch drops, not only what it adds. A tree without `docs/adrs/000` has lost the rule that an accepted decision is superseded.
- A long-lived branch with no ruleset beside a protected `main` is the operator's decision. Name it and stop.
- Do not add protection, and do not push to a branch another agent wrote.
