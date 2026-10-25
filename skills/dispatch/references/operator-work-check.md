# Is there work?

An empty tracker is a finding: answer from the remote when asked, not from a clone.

- **The repository, then the organisation.** `gh issue list`, `gh pr list --state open`, `gh api 'search/issues?q=org:aivara-se+is:open'`; silence and `0` are different claims.
- **The boards, if the token holds `read:project`.** `gh project list --owner aivara-se`, `gh project item-list <number> --owner aivara-se`; a refused scope and a closed board read the same.
- **A remote branch with no open pull request** is unlanded work: `git log --oneline main..origin/<branch>`, `gh pr list --state all --head <branch>`.
- **A closed unmerged pull request** may be folded into a merged one: grep the tree for its symbol.
- **The gate at the default branch**: nothing to implement is a claim about a clean tree, not an empty list.

Report what is open, or that nothing is, then the tree's state.
