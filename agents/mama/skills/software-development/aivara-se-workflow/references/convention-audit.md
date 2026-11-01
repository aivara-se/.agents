# Auditing a document set

For "are these documents, instructions and workflows up to date?" about a repository that defines a convention — `aivara-se/.template`, `.github/docs`, `.agents` — or about one repository's `AGENTS.md`, `README.md` and workflows. It is a read-only pass until the operator asks for the edits.

## The shape

A document set is current when three things agree: its own text, the copies its consumers carry, and the decisions that landed after it was last written. The drift is almost never in the file you were handed.

1. **Pin the donor's head and its last event.** `git fetch origin`, then `git log --oneline --date=short origin/main`; the last commit's date is the cutoff for "recent changes". Read every merged pull request body (`gh pr list --state all`, `gh pr view <n> --json body`): a *Left out* or *Out of scope* list is a debt ledger — each item either landed (check the consumer) or is still owed. A follow-up named in a body and never done is the most common finding, and the body proves it was deliberate rather than forgotten.

2. **Enumerate the consumers and diff section sets.** `gh repo list aivara-se`, then per repository `git ls-tree -r --name-only origin/main | grep -E 'AGENTS\.md|workflows/'` and `git show origin/main:AGENTS.md | grep -n '^#'`. Compare headings, not prose: a copy carrying a section the donor deleted is stale in the sweep direction; a copy missing a section the donor added is behind. A repository with no copy at all is the strongest finding — a claim that "every repository adopts it" is counted, never assumed. Check `gh search issues --owner aivara-se --state open` for an open item already tracking the gap before proposing one.

3. **List what changed elsewhere since the donor's date.** In the repositories that own the surrounding rules — `.agents` for skills and the roster, `.github` for the baseline and releases — run `git log --oneline --since=<donor date> origin/main`. Every rule change dated after the donor's last commit is a candidate contradiction, and the donor predates it by construction.

4. **Check the workflow against its enforcement, not its comment.** `actionlint <workflow>`, then `aivara-se/.github/docs/SETTINGS.md` for what the organisation requires of the check (name, required, merge method, empty bypass) and `GH_TOKEN=$(gh auth token) bun run scripts/verify-settings.ts --repo <name> --json` in the `.github` clone for what the repository actually carries. Settings the token cannot read come back as `403` and `false`: that is the token's scope, not the repository's state — confirm with `gh api repos/<org>/<repo>` before reporting it.

5. **Grade every finding as donor, consumer, or decision.** A donor that tells adopters to do what the baseline now forbids is the donor's fix. A copy that predates the donor's last commit is the sweep's. A rule two documents state differently — a filled review-target slot against a documents-only rule — is neither: name both sides and whose decision it is.

## Pitfalls

- **A placeholder step satisfies a required check and checks nothing.** When the standard makes `validate` the merge gate, a template whose adopted workflow runs `echo` hands every new repository a green no-op. Say so, and point at the bootstrap order that lands the workflow with the first code.
- **A single slot cannot carry a rule that now varies.** When the surrounding skills split review targets by change type, a filled slot reading "the operator and one peer" is wrong for half its uses — the wording of the slot, not its value, is the finding.
- **Read every quote from the remote ref.** A shared clone can be checked out on another session's branch — `git status -sb` naming anything but `main` is the tell — and `cat`/`sed` then reads that branch's files while `git log origin/main` reads the remote's. Use `git show origin/main:<path>` for every file the report quotes.
- **A copy that deviated deliberately is not a bug in the donor.** The merged body that removed a section says why; grade the copy as un-swept, not the donor as wrong, and do not re-add what the operator deleted.
- **The donor's prose being internally coherent proves nothing.** Score it against consumers and later decisions: a document can be well written, gate-green and still describe an organisation that no longer exists.

## Repairing it

When the operator asks for the edits, land them as one documents-only pull request per repository — the donor first, then each adopter — reviewed by the operator alone, with auto-merge armed on the head that was pushed.

- **The donor's own contradictions are the first pull request.** Read the merged body that created the donor against its README: an adoption step can still prescribe what the body's rationale moved, and a step list that contradicts the decision is the donor's defect, not an adopter's.
- **Re-adopt a copy in the donor's section order.** Purpose paragraph, the convention line, *Where a fact lives*, house rules, tooling, *Skills*, *Verify before pushing*, *Version Control*. Add what the copy lacks; do not reflow the sections it already has.
- **Every removed section has a destination.** Current state or focus moves to `PRODUCT.md`; a tree map moves to `SYSTEMS.md`, and a repository with no system document keeps the map with a line in the body saying why; the `version N, adopted from <sha>` line is deleted, because the commit records it. Deleting a section without moving its content loses a rule the operator wrote.
- **House rules are read out of the repository, never invented.** Take them from `PRODUCT.md`'s *What it never does* and `SYSTEMS.md`'s store and failure sections; a prohibition with no sentence behind it does not go in.
- **Prove the copy before pushing.** `actionlint` on a workflow change, a `{{`-slot count, `git diff --check`, and the repository's own gate — a bun repository's frozen install, check, format, test and build; a Go repository's `gofmt`, `vet` and `test` under `TMPDIR=$HOME/tmp`.
- **A false document the new text points at is in scope.** When the entry file says the README tells you where it deploys and the README still names the previous host, one pull request carries both: the pointer otherwise sends the reader to the lie. Say that in the body instead of filing the README as a follow-up.
- **A branch opened before another merge comes back `BEHIND`.** `git fetch`, `git rebase origin/main`, `git push --force-with-lease`, then re-request review: the ruleset requires the branch to be current, and force-pushing your own unreviewed branch is the sanctioned way to update it.
- **Amend rather than stack while no review has landed.** A second document found after the pull request opened becomes an amended commit and a `--force-with-lease` push, because a rebase merge lands every commit the branch carries and a fix commit beside the original reads as churn.

## Report shape

Hardest first, one or two lines each with the path and both halves of the conflict. Then what already checks out, so the list is not read as an order to rewrite everything. End with the split: mechanical sweeps the agent can do, and decisions that are the operator's.
