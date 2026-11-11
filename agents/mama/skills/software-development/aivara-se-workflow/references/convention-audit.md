# Auditing a document set

Use for "are these documents up to date?" about a convention repository — `aivara-se/.template`, `.github/docs`, `.agents` — or one repository's `AGENTS.md`, `README.md` and workflows, including a repository that has just moved into the organisation. Read-only until the operator asks for edits.

## The shape

A set is current when its text, its consumers' copies and later decisions agree. Drift is rarely in the file you were handed.

1. **Pin the donor's head.** `git fetch origin`, then `git log --oneline --date=short origin/main`; the last date is the cutoff for "recent changes". Read every merged body (`gh pr list --state all`, `gh pr view <n> --json body`): a _Left out_ list is a debt ledger — each item landed or owed. A follow-up named and never done is the top finding, and the body proves it deliberate.
2. **Diff the consumers.** `gh repo list aivara-se`, then per repository `git ls-tree -r --name-only origin/main | grep -E 'AGENTS\.md|workflows/'` and `git show origin/main:AGENTS.md | grep -n '^#'`. Compare headings, not prose: a copy carrying a deleted section is stale, one missing an added section is behind. No copy at all is the strongest finding — count the adoption claim, never assume it. Check `gh search issues --owner aivara-se --state open` before proposing an item, and check open pull requests too (`gh pr list --state all`): a repository mid-adoption carries most of its gaps in one, and an item that repeats that work spends a second review. Grade the body against the head — a body saying the entry file "is now unforked" while the head still carries the per-repository paragraph is answered in a review of that head, not in a new issue.
3. **List later changes elsewhere.** In `.agents` (skills, roster) and `.github` (baseline) run `git log --oneline --since=<donor date> origin/main`. Every later rule change is a candidate contradiction: the donor predates it by construction.
4. **Check enforcement, not the comment.** `actionlint <workflow>`, then `aivara-se/.github/docs/SETTINGS.md` for what the organisation requires (name, required, merge method, empty bypass), and `GH_TOKEN=$(gh auth token) bun run scripts/verify-settings.ts --repo <name> --json` for what the repository carries. A `403` or `false` setting is token scope, not repository state — confirm with `gh api repos/<org>/<repo>` first.
5. **Grade each finding.** Donor, consumer, or decision: a donor telling adopters to do what the baseline forbids is the donor's fix, a copy older than its last commit is the sweep's. A rule two documents state differently — a filled slot against a documents-only rule — is neither: name both sides and whose decision it is.

## Auditing one repository against the standard

A repository that has just joined the organisation is the same pass, with the standard as donor and the repository as consumer. Its findings become one issue each, not a pull request.

1. **Run the shared checkers at it, not on it.** Clone `aivara-se/.github` and `bun install --frozen-lockfile`, then `bun run scripts/validate-docs.ts ../<repo> --require` and `bun run scripts/validate-agents.ts --canon docs/ENTRY.md --entry ../<repo>/AGENTS.md`. A pass on the pair with a fail on the entry file is the common state: the documents were brought into line and the front door was not.
2. **Diff the entry file across the fleet in one loop.** Every repository is a consumer of the same file, so a finding one carries is usually theirs all: `gh repo list aivara-se --json name -q '.[].name'`, then `diff docs/ENTRY.md <clone>/AGENTS.md` per clone. Say which state the auditee is in — ahead of its peers, level, or behind them — and land a fleet-wide finding as one pull request per repository, never one pull request over several.
3. **Enumerate what each claim needs before believing it.** A document naming a suite, a measurement, a host or a check is a finding until the file exists: `find . -name '*.test.ts'`, `grep -rn 'playwright\|puppeteer\|cypress'`, the named script in `package.json`, `git ls-tree` for the workflow. A design document promising a browser suite, a build-time contrast measurement or an offline first run fails this every time — the promise is written in the same voice as the values.
4. **Prove a deployment claim on the live host, not the tree.** `gh api repos/<org>/<repo>/pages` answers `cname`, `html_url` and `build_type`; then `curl -s -o /dev/null -w '%{http_code}'` the root, a path the site does not hold, and the asset URL the body of that path names. A **fallback** page is emitted with absolute asset URLs and its own base, so a project site (`…github.io/<repo>/`) boots at the root and dies on every other path: the body is the shell, its scripts point at `/<app-prefix>/…` on the org's root, and those 404. A commit that dropped a `BASE_PATH` for a custom domain is the tell — check that the Pages settings still name that domain before trusting the code. A `404` from the project URL while `pages` answers `status: built` is a stale build, not a routing rule: read `pages/builds/latest` for its `created_at` and `commit`, compare it with `git log -1 origin/main`, then `POST repos/<org>/<repo>/pages/builds`. The site answers again in about twenty seconds. Prove which commit is served with a version marker the shell carries — `curl -s <url>/sw.js | grep '^const CACHE'` against `git show origin/main:sw.js` — because a `200` proves only that something is deployed, and a document's "the live game is <url>" is a claim until both hold.
5. **Grade a workflow by its name and its trigger.** A file called `publish.yml` that uploads a pages artifact publishes nothing, and `RELEASES.md` gives that name to the version-triggered release; the other deploy repository calls its file `deploy.yml`. A required check whose workflow triggers only on `pull_request` reports nothing on `merge_group`.
6. **Split the findings by who can land them.** Documents and records are the architect's; code, workflows and tests are a builder's, one issue each with the file, the failing line and the acceptance; an input only the operator holds — a DNS record, a custom domain, a reformat that rewrites the whole tree — is named as theirs with the one sentence of why, and left unassigned: writing an assignee starts that agent's run, and no run can make an admin setting. Name the setting and the read-back that proves it.

## Pitfalls

- **A placeholder step checks nothing.** Under a `validate` gate, a template whose workflow runs `echo` ships a green no-op. Name the bootstrap order that lands the workflow with the first code.
- **One slot cannot carry a varying rule.** A filled slot reading "the operator and one peer" is wrong once skills split review targets by change type — the wording, not the value, is the finding.
- **Quote from the remote ref.** A shared clone can sit on another session's branch (`git status -sb` naming anything but `main`), so `cat` reads that branch while `git log origin/main` reads the remote. Use `git show origin/main:<path>`.
- **A deliberate deviation is not a bug.** The merged body says why. Grade the copy as un-swept; never re-add what the operator deleted.
- **Coherent prose proves nothing.** Score it against consumers and later decisions: a well-written, gate-green document can describe an organisation that no longer exists.
- **A comment beside a command is a claim.** `bun run build  # … and the checks the build reruns` was false: `build` was `vite build` alone. Read the `scripts` map in `package.json` before trusting an annotation in an entry file; a check lives in the script its own step names.
- **A test that validates the readers does not validate the writers.** One test checked every word's colour key against `COLORS`; nothing read `EMOJI_COLORS`, the table that produces those keys, so a typo resolved to no colour and drew in the ink — which reads as a design choice. Enumerate a table's writers as well as its consumers.
- **A value stated in two homes needs one check that reads both.** A colour table in the design document and the same hex values in the stylesheet drift with the first hand edit; a test that parses both and compares them is the only thing keeping them one fact — and it is the check a document promising "measured at build" should have been.
- **A generated record is recounted from its source.** A file a script writes — a `--write` report, a measurements table — asserts in its own header that it covers the current data, and nothing regenerates it when the data shrinks: a drill record with 44 rows against 39 drills, six of them for lessons the course dropped. Count the rows and diff the ids against the source array; the fix is to rerun the generator, not to edit the prose.
- **A figure a check prints is read off the check, never remembered.** Budgets, file counts and cache names sit one bump behind the document quoting them: 33 files and a 500 KB budget where the checker prints 15 files and 1500, a cache name two versions old, "thirteen sprites" against 15. Grep the document for every number a check owns and compare one run of it; keep the history as history and the live value as output.

## Changing the standard itself

A request to change what `PRODUCT.md` and `SYSTEMS.md` hold is a design pass over the whole set, not a rewrite of one file.

- **Measure with the gate, not `wc -w`.** The checker counts prose, list text and table cells, and drops headings, fenced code, link targets, HTML comments, table rules and list markers — so `wc` overstates a bulleted section by one word per bullet. Run the checker for the number a cap is judged on; use `wc` only for the before/after argument.
- **Make the per-section caps sum to the stated total.** A cap table beside a total that does not add up fails the first lint run and reads as carelessness.
- **Enforce shape, not prose.** Heading set, order, per-section caps, dead links, repeated sentences. A style check on adjectives is satisfied by deleting the rule.
- **Break the repetition between the two documents.** A sentence that answers two questions belongs in one, and the shorter document links to it.
- **A product document carries what an agent may change alone**: everything the two documents do not fix, inside the scope, except a dependency, the data model and an external interface. Scope alone does not grant autonomy.
- **A word that leaves a document has a destination** — an ADR, an issue, a test, the release record. Deleting it makes the rewrite a loss and the next reader repeats the decision.
- **Migrate worst-first.** The largest file pays for the checker's first red run; then one documents-only pull request per repository.
- **Draft to the cap, then cut.** Run the checker and trim the section it names; keep a few words of headroom in each, and move a fact that does not fit to its destination rather than squeeze the rule.
- **Pin the numbers to the document.** A test that parses the standard's cap table and compares it with the checker's constants fails when one moves without the other; the two homes then stay one fact.
- **A present-tense enforcement claim is a finding until the tree carries it.** `git ls-tree` and `git grep` for every script, workflow and path the section names: a standard can describe a checker no commit ever added, and call a workflow shared when no reusable workflow exists. When the operator answers with a new name for it, the instruction is build it under that name.
- **Date a present-tense rule or it is false at merge.** The standard binds a document written after it merges; an existing document comes into line at its next revision. Name the repositories still out of line, with their measured word counts.
- **A checker's adoption follows the documents.** Wired into a required `validate` job, it turns every unrelated pull request red in a repository whose documents are not yet rewritten. Each repository calls the shared workflow in the pull request that brings its documents into line.
- **A machine-run check needs its unit.** "Twelve words repeated" and a per-section cap are unimplementable until the text says what counts as a word and which markdown is excluded; state the shingle length, the normalization and the failure message.

## Repairing it

On request, land one documents-only pull request per repository — donor first, then each adopter — reviewed by the operator alone, auto-merge armed on the head you pushed.

- **Donor contradictions go first.** A merged body's rationale can leave an adoption step prescribing what it moved.
- **Re-adopt in the donor's section order.** Purpose, convention line, _Where a fact lives_, house rules, tooling, _Skills_, _Verify before pushing_, _Version Control_. Add what is missing; never reflow the rest.
- **Every removed section has a destination.** Focus goes to `PRODUCT.md`, a tree map to `SYSTEMS.md` (or a body line saying why there is none). Delete `version N, adopted from <sha>` — the commit records it.
- **Read house rules out of the repository.** Use `PRODUCT.md`'s `## Scope` Never list and `SYSTEMS.md`'s state and failure sections. A prohibition with no sentence behind it does not go in.
- **Prove the copy before pushing.** `actionlint` on a workflow change, a `{{`-slot count, `git diff --check`, the repository's gate — bun: frozen install, check, format, test, build; Go: `gofmt`, `vet`, `test` under `TMPDIR=$HOME/tmp`.
- **A false document the new text points at is in scope.** An entry file pointing at a README that still names the old host needs one pull request carrying both, or the pointer sends the reader to the lie.
- **A branch opened before another merge reads `BEHIND`.** `git fetch`, `git rebase origin/main`, `git push --force-with-lease`, re-request review: the ruleset requires a current branch, and that push is sanctioned.
- **Amend, do not stack.** A document found after the pull request opened becomes an amended commit and a `--force-with-lease` push: a rebase merge lands every commit, so a fix commit reads as churn.

## Report

Hardest first, with the path and both halves of the conflict, then what already checks out, then the split: documents to the architect, code to a builder, and the inputs only the operator holds — a DNS record, a whole-tree reformat — with, on a repository audit, which findings the fleet carries rather than this repository.
