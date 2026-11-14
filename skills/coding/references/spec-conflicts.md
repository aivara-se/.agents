# When a request contradicts a merged decision

Stop, and settle the paper before the code.

- **A merged ADR that assumes a missing capability is the operator's call.** Name the ADR, the platform and the options. Do not build the surface.
- **An operator request against a merged ADR is that stop.** Ask nothing more: write the new ADR.
- **An old ADR is never edited, whatever it now says.** The new one's Consequences names the sentence each older ADR loses, and the spec lines move to the new truth in the same commit.
- **A reversed UI decision is still a decision.** No ADR, no code.
- **A batch of answers is one spec.** Read the answers against each other, and when two contradict, ask which wins before you build either.
- **A follow-up on the same unmerged change amends it.** `git commit --amend`, then `git push --force-with-lease`. A commit that reverses the one above it is a work-in-progress pair, and a second ADR contradicts the first.
- **Amend only while no pull request exists and no reviewer has read the branch.** After that a fix is a new commit, and an ADR whose decision grew is rewritten under its file name and links.
