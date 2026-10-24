# Is there work?

An empty tracker is a finding: answer it from the remote at the moment you are asked, not from a clone or a listing that printed nothing.

1. **The named repository first**, then the organisation — `gh issue list`/`gh pr list --state open`, and `gh api 'search/issues?q=org:aivara-se+is:open'` for the cross-repo count. A `gh search` that returns silence and an API total of `0` are different claims; get the number.
2. **The project boards** — `gh project list --owner aivara-se`, then `gh project item-list <number> --owner aivara-se`. Cards live there and nowhere else; an issue list alone does not clear the board.
3. **Every remote branch with no open pull request** is unlanded work until proven otherwise: `git log --oneline main..origin/<branch>`, then `gh pr list --state all --head <branch>`. A pull request closed with `mergedAt: null` is not lost work — its commits are often folded into another pull request that did merge. Grep the tree at the default branch for the symbol the diff introduced before you report or redo it.
4. **Run the gate at the default branch** and keep its output. "Nothing to implement" is a claim about a tree that builds and tests clean, not about an empty list.

Report what is open, or that nothing is, then the tree's state, then anything stale you noticed (local clones beside the real one, a leftover branch). Do not narrate the sweep.
