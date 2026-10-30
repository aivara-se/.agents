# Delivering against frozen documents

For the assignment that is a prompt plus a repository's documents, with no board card. The documents (entry file, README, product doc, system doc, ADRs) are the specification and the design is frozen; the deliverable is one branch, one commit and one pull request, with every reading of a gap stated in that pull request's body.

## Before the first line

- Read in the order the assignment names them: the entry file, the README, the product doc, the system doc, every ADR, then the organisation's skills. The documents outrank the prompt's summary of them.
- Confirm every external value the documents defer to the operator before committing it — an absolute host path, a login, a secret's name. A value the sandbox cannot see is a question, not a guess.
- Verify what is checkable: a login exists (`gh api users/<login> --jq .login`), the default branch, the toolchain the CI file already pins.

## When two documents disagree, or a step cannot be built as written

STOP. Do not pick a reading, do not weaken a rule to make something pass, do not invent a mechanism, and do not ship a test that proves the weaker claim. Ask the operator in one message that names: the document and its line, the two readings, and the smallest input that unblocks you. Batch every open question into that one ask — one round of answers beats a chain.

An operator's answer overrides the freeze. Apply it as the smallest edit to the document it corrects, change nothing else, and say in the pull request body what moved and why. The rule is the `writing` skill's: a document the change makes untrue is fixed in the same change.

## When the documents are already merged and the code follows

The operator merged the design change and asks for the implementation to match it, with the diff kept minimal and the documents left alone. The freeze is no longer yours to edit: the documents are the shipped contract, and the usual "fix the doc in the same change" rule is suspended. Say in the pull request body that the documents were left out by instruction.

- Read the merged pull request before the diff: `gh pr view <n> --repo <owner>/<repo> --json title,body,files,baseRefName,mergedAt`. Its body names the flow; the ADR it added states the decision in bullets, and the system doc's numbered steps are the operational checklist. Those two, not your reading of the code, say what must be true.
- Diff the code against the numbered steps and implement only the deltas. Where the new flow mirrors an old one, generalize the existing predicate into named booleans (`review`, `changes`) and keep one shared gate after it — dedup, the actor-never-woken rule, the configuration lookup — so both flows are governed by the same lines instead of a second copy of the pipeline.
- Decoded-payload changes are additive: new struct fields for the new login and the new state, nothing restructured.
- Grep the test tree for every audit `Why`/reason string you reword (`grep -rn '<fragment>' --include='*_test.go' .`); a wording change made for honesty is only safe once nothing asserts the old sentence.
- One test per new start path (profile and exact reason) and one per ignored variant the doc names (approval, comment). Map them to the document's own Checks and acceptance lines in the pull request body.
- A start path proven only against the runner stub is not proven: the system doc's Checks ask for one signed POST per flow, so the argv test is table-driven over every flow and asserts each reason sentence. Same for the filter — every action and state the doc names gets a case, including the ones that must start nothing (`edited`, `dismissed`), because the action clause and the state clause are separate guards and either can be dropped silently.

## The pull request body

- what changed, one line per file or package;
- the readings chosen where a document left a gap — a value with no configured home, a timeout, a rotation size — stated as readings, never chosen in silence;
- what was verified: each command, the tree or SHA it ran against, the real numbers, and any hand check (a booted binary, a fake dependency's captured argv);
- what was left out;
- the acceptance list, one line per item, mapped to the test that proves it: `acceptance — TestX`. An acceptance line with no test named is unfinished work.

## Gates and history

- Run the repository's own gate on the final tree, the whole sequence, each result read rather than the last exit code alone — for a Go repository `gofmt -l .`, `go vet ./...`, `go test ./...`.
- Boot the artifact by hand when the change ships a binary; `testing`'s `references/process-and-server-checks.md` has the recipe, and the body quotes it.
- No leftover TODO, no follow-up pull request, no unfilled slot. The review round's fixes belong in the single commit, not stacked on it (`github`'s `references/pr-workflow.md`, *Fold the attempts before the branch leaves the machine*), and the review replies go out only after the fix is pushed.

## The review rounds

- Read all three sources every time you check: `gh pr view <n> --json reviews` for verdicts, `gh api repos/<owner>/<repo>/pulls/<n>/comments` for inline comments (they carry `path` and `line`), and the issue comments. A peer's review sweep can end in a withdrawal and an approval in the same round — read the states in order, not just the latest body.
- The operator's inline comments are the live blocker; a peer's change request that the same round supersedes is not.
- A peer's review is a claim like any other: check its factual assertions against the base tree (`git show origin/main:AGENTS.md`) before editing — a request premised on what the file "already carried" can be simply wrong.
- A coverage finding is cheap to settle: delete the clause it says is unpinned (or rewrite the sentence it says is unasserted), run that package's tests, and read whether anything fails; then `git checkout -- <path>`. Green under the mutant means the finding is real — the fix is a test, never a behaviour change, so it is not scope creep and does not touch the documents. Restore from git, not from a hand-kept copy: a mistyped backup path fails silently and leaves the mutation in the tree, which the next commit would ship.
- Answer the operator in behaviour-versus-scope terms: which findings change what the service does (none named by a shipped ADR are negotiable) and which only pin it. A finding that a document's Checks already demands is in scope by the repository's own rules, even when the implementation is correct without it.
- When a peer's request collides with an instruction the operator already gave on the same file, the operator's note stands: put the collision to him in one question if he is reachable, and otherwise answer the peer on the pull request with the citation rather than reversing the operator to clear the review.
- Any force-push dismisses outstanding approvals. After a rebase or an amend, re-request review from the operator and from every peer whose approval was dismissed; never assume an earlier approval still stands.
- Keep the rebase honest: `gofmt`/`vet`/`test` on the rebased tree, the PR body's SHA updated, then `git commit --amend` and `git push --force-with-lease` so the branch stays one commit.

## One gate, not two

- Before adding a CI workflow of your own, check whether `main` already grew one while you were on the branch: `git show origin/main:.github/workflows/`. If it runs the same gate, put the missing steps into that file and delete yours.
- Delete the stopgap guard along with it when the change removes its premise — a guard that exits 0 while a tree has no code is dead once the code lands, and the comment claiming "no package yet" becomes a lie in the same commit.
- Confirm with `gh pr checks <n>` that one job, not two, runs. The surviving workflow does not go into the AGENTS.md map: a map names what a reader has to find, and a root file obvious from the tree earns no line.

## When the operator rules a committed file out of the tree

- A host-specific file — a configuration naming absolute paths and this host's agents — is sometimes ruled out of the repository. Then: its shape becomes an example section in `README.md`, the path goes into `.gitignore` so a local copy cannot be committed by accident, and a test extracts the fenced block from the README and loads it through the real loader, so the shipped example cannot rot.
- Amend the documents that claimed it was committed (an ADR's context and consequences) in the same pull request, with the operator's go-ahead — the freeze still holds for the documents, so the edit is a question first.

## When the operator cuts a promised feature

- Move the product doc first: remove the promise, its acceptance line and any consequence that depends on it from PRODUCT, and the same from SYSTEMS and README where they repeat it.
- An accepted ADR is not edited. Add the next numbered record: the decision, the clauses it overrides (record and section), and what the person loses. Name the override in the pull request.
- Delete the dead code and its tests in the same change — a removed flow leaves no helper, store read or fixture behind.

## A peer in the same clone, and a PR that merges under you

- Confirm the branch and the PR before staging and again before pushing: `git fetch`, `git log --oneline -3`, `gh pr view <n> --json state,headRefOid,mergedAt`. A peer can commit or amend in the shared clone under your identity.
- If the PR merged while you worked, a commit pushed to its branch is not delivered. Branch from `origin/main`, cherry-pick your commit, and open a new PR; never force-push the merged branch or rewrite the peer's commits.
- Stage named paths. A peer's untracked file or amended commit is not yours to add.
- A push after a merge prints success; only `mergedAt` and the commit appearing on `origin/main` prove delivery.

## Pinning a child process's argv

- Do not write a shell-script fixture for the binary a run launches: a temp directory may be mounted noexec, so the script cannot be executed and the test fails for the wrong reason. Point the runner at the test binary itself (`os.Args[0]`) and intercept the re-execution in `TestMain`: when the argv-marker env var is set and `os.Args[1]` is the expected first flag, write `os.Args[1:]` to the marker's file and `os.Exit(0)`. `TestMain` runs before `flag.Parse`, so an unknown `--profile` never reaches the flag set.
- Poll for the marker file with a bounded deadline, then compare the argv one element at a time against the expected command line, and assert a sentinel planted in every payload text field appears in none of them — that is the test that proves the reason was assembled from identifiers.
- Set the marker env var and the capture path inside each subtest (`t.Setenv`, `t.TempDir` in the closure), not once above the table: a capture path created once lets the second case read the first case's argv and pass against the wrong command line. The login a case needs in the payload (an author, a reviewer) must be the configured one, while every field the reason must not echo stays a sentinel.
