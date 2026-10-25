# Is there work?

An empty tracker is a finding: answer from the remote when asked, not from a clone.

- **The named repository first, then the organisation.** `gh issue list`, `gh pr list --state open`, `gh api 'search/issues?q=org:aivara-se+is:open'`. Silence and a total of `0` are different claims.
- **The boards.** `gh project list --owner aivara-se`, then `gh project item-list <number> --owner aivara-se`; an issue list does not clear a board.
- **A remote branch with no open pull request** is unlanded work: `git log --oneline main..origin/<branch>`, then `gh pr list --state all --head <branch>`.
- **One closed unmerged** may be folded into a merged pull request: grep the tree for its symbol before redoing it.
- **The gate at the default branch**, with its output kept: nothing to implement is a claim about a clean tree, not an empty list.

Report what is open, or that nothing is, then the tree's state.
