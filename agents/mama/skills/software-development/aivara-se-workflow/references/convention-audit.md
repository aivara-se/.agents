# Auditing a document set

Use for "are these documents up to date?" about a convention repository — `aivara-se/.template`, `.github/docs`, `.agents` — or one repository's `AGENTS.md`, `README.md` and workflows. Read-only until the operator asks for edits.

## The shape

A set is current when its text, its consumers' copies and later decisions agree. Drift is rarely in the file you were handed.

1. **Pin the donor's head.** `git fetch origin`, then `git log --oneline --date=short origin/main`; the last date is the cutoff for "recent changes". Read every merged body (`gh pr list --state all`, `gh pr view <n> --json body`): a _Left out_ list is a debt ledger — each item landed or owed. A follow-up named and never done is the top finding, and the body proves it deliberate.
2. **Diff the consumers.** `gh repo list aivara-se`, then per repository `git ls-tree -r --name-only origin/main | grep -E 'AGENTS\.md|workflows/'` and `git show origin/main:AGENTS.md | grep -n '^#'`. Compare headings, not prose: a copy carrying a deleted section is stale, one missing an added section is behind. No copy at all is the strongest finding — count the adoption claim, never assume it. Check `gh search issues --owner aivara-se --state open` before proposing an item.
3. **List later changes elsewhere.** In `.agents` (skills, roster) and `.github` (baseline) run `git log --oneline --since=<donor date> origin/main`. Every later rule change is a candidate contradiction: the donor predates it by construction.
4. **Check enforcement, not the comment.** `actionlint <workflow>`, then `aivara-se/.github/docs/SETTINGS.md` for what the organisation requires (name, required, merge method, empty bypass), and `GH_TOKEN=$(gh auth token) bun run scripts/verify-settings.ts --repo <name> --json` for what the repository carries. A `403` or `false` setting is token scope, not repository state — confirm with `gh api repos/<org>/<repo>` first.
5. **Grade each finding.** Donor, consumer, or decision: a donor telling adopters to do what the baseline forbids is the donor's fix, a copy older than its last commit is the sweep's. A rule two documents state differently — a filled slot against a documents-only rule — is neither: name both sides and whose decision it is.

## Pitfalls

- **A placeholder step checks nothing.** Under a `validate` gate, a template whose workflow runs `echo` ships a green no-op. Name the bootstrap order that lands the workflow with the first code.
- **One slot cannot carry a varying rule.** A filled slot reading "the operator and one peer" is wrong once skills split review targets by change type — the wording, not the value, is the finding.
- **Quote from the remote ref.** A shared clone can sit on another session's branch (`git status -sb` naming anything but `main`), so `cat` reads that branch while `git log origin/main` reads the remote. Use `git show origin/main:<path>`.
- **A deliberate deviation is not a bug.** The merged body says why. Grade the copy as un-swept; never re-add what the operator deleted.
- **Coherent prose proves nothing.** Score it against consumers and later decisions: a well-written, gate-green document can describe an organisation that no longer exists.

## Changing the standard itself

A request to change what `PRODUCT.md` and `SYSTEMS.md` hold is a design pass over the whole set, not a rewrite of one file.

- **Measure before you propose.** `wc -w` per file, then per section (`re.split(r'(?m)^## ', text)`); the argument is the number, and the caps come from what the content needs.
- **Make the per-section caps sum to the stated total.** A cap table beside a total that does not add up fails the first lint run and reads as carelessness.
- **Enforce shape, not prose.** Heading set, order, per-section caps, dead links, repeated sentences. A style check on adjectives is satisfied by deleting the rule.
- **Break the repetition between the two documents.** A sentence that answers two questions belongs in one, and the shorter document links to it.
- **A product document carries what an agent may change alone**: everything the two documents do not fix, inside the scope, except a dependency, the data model and an external interface. Scope alone does not grant autonomy.
- **A word that leaves a document has a destination** — an ADR, an issue, a test, a changelog. Deleting it makes the rewrite a loss and the next reader repeats the decision.
- **Migrate worst-first.** The largest file pays for the checker's first red run; then one documents-only pull request per repository.

## Repairing it

On request, land one documents-only pull request per repository — donor first, then each adopter — reviewed by the operator alone, auto-merge armed on the head you pushed.

- **Donor contradictions go first.** A merged body's rationale can leave an adoption step prescribing what it moved.
- **Re-adopt in the donor's section order.** Purpose, convention line, _Where a fact lives_, house rules, tooling, _Skills_, _Verify before pushing_, _Version Control_. Add what is missing; never reflow the rest.
- **Every removed section has a destination.** Focus goes to `PRODUCT.md`, a tree map to `SYSTEMS.md` (or a body line saying why there is none). Delete `version N, adopted from <sha>` — the commit records it.
- **Read house rules out of the repository.** Use `PRODUCT.md`'s _What it never does_ and `SYSTEMS.md`'s store and failure sections. A prohibition with no sentence behind it does not go in.
- **Prove the copy before pushing.** `actionlint` on a workflow change, a `{{`-slot count, `git diff --check`, the repository's gate — bun: frozen install, check, format, test, build; Go: `gofmt`, `vet`, `test` under `TMPDIR=$HOME/tmp`.
- **A false document the new text points at is in scope.** An entry file pointing at a README that still names the old host needs one pull request carrying both, or the pointer sends the reader to the lie.
- **A branch opened before another merge reads `BEHIND`.** `git fetch`, `git rebase origin/main`, `git push --force-with-lease`, re-request review: the ruleset requires a current branch, and that push is sanctioned.
- **Amend, do not stack.** A document found after the pull request opened becomes an amended commit and a `--force-with-lease` push: a rebase merge lands every commit, so a fix commit reads as churn.

## Report

Hardest first, with the path and both halves of the conflict, then what already checks out, then the split: mechanical sweeps and the operator's decisions.
