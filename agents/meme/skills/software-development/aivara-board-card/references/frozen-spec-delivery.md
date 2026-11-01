# Delivering against frozen documents

The assignment is a prompt plus a repository's documents, with no board card. Those documents (entry file, README, product doc, system doc, ADRs) are the specification, and the design is frozen. Deliver one branch, one commit and one pull request, stating every reading of a gap in its body.

## Before the first line

- Read in the order the assignment names: entry file, README, product doc, system doc, every ADR, then the organisation's skills. The documents outrank the prompt's summary.
- Confirm every external value the documents defer to the operator — a host path, a login, a secret's name. A value the sandbox cannot see is a question, not a guess.
- Verify what is checkable: the login (`gh api users/<login> --jq .login`), the default branch, the toolchain the CI file pins.

## When documents disagree, or a step cannot be built as written

STOP. Do not pick a reading, weaken a rule, invent a mechanism, or ship a test that proves the weaker claim. Ask the operator once, naming the document and line, the two readings, and the smallest input that unblocks you; batch every question into that ask.

An operator's answer overrides the freeze: the smallest edit to the document it corrects, nothing else, and the body says what moved. A document the change makes untrue is fixed in the same change.

## When the documents are already merged and the code follows

The design is merged and the code must match it, with a minimal diff and the documents untouched. The freeze is not yours to edit, and "fix the doc in the same change" is suspended. Say in the body that the documents were left out by instruction.

- Read the merged pull request before the diff: `gh pr view <n> --repo <owner>/<repo> --json title,body,files,baseRefName,mergedAt`. Its ADR states the decision and the system doc's numbered steps are the checklist — those, not your reading of the code, say what must be true.
- Implement only the deltas. Where a new flow mirrors an old one, generalize the predicate into named booleans (`review`, `changes`) with one shared gate after it — dedup, actor rule, config lookup — not a second pipeline. Decoded-payload changes are additive: new fields, nothing restructured.
- Grep the tests for every reworded `Why`/reason string (`grep -rn '<fragment>' --include='*_test.go' .`): safe only when nothing asserts the old sentence.
- One test per new start path (profile and exact reason) and per ignored variant (approval, comment), mapped to the doc's Checks and acceptance lines.
- A start path proven only against the stub is not proven: the argv test is table-driven, one signed POST per flow, asserting each reason. Every action and state gets a case, including those that start nothing (`edited`, `dismissed`) — the two guards are separate and either can drop silently.

## The pull request body

- what changed, one line per file or package;
- the readings taken where a document left a gap — a value with no configured home, a timeout — never chosen in silence;
- what was verified: each command, the tree or SHA, the real numbers, any hand check;
- what was left out;
- the acceptance list, one line per item, mapped to its test: `acceptance — TestX`. An acceptance line with no test named is unfinished work.

## Gates and history

- Run the repository's own gate on the final tree, each result read: `gofmt -l .`, `go vet ./...`, `go test ./...`.
- Boot the artifact by hand when the change ships a binary; `testing`'s `references/process-and-server-checks.md` has the recipe and the body quotes it.
- No leftover TODO, no follow-up pull request, no unfilled slot. Round fixes belong in the single commit (`github`'s `references/pr-workflow.md`, _Fold the attempts before the branch leaves the machine_); review replies go out only after the push.

## The review rounds

- Read three sources every time: `gh pr view <n> --json reviews`, `gh api repos/<owner>/<repo>/pulls/<n>/comments` (inline, with `path` and `line`), and the issue comments. Read states in order: the operator's inline notes block, a superseded peer request does not.
- A peer's review is a claim: check it against the base tree (`git show origin/main:AGENTS.md`).
- Settle a coverage finding by deleting the clause it names, running that package's tests, then `git checkout -- <path>`. Green under the mutant means the finding is real and the fix is a test, not a behaviour change. Restore from git: a mistyped backup path ships the mutation.
- Answer in behaviour-versus-scope terms: what changes behaviour moves only through a shipped ADR; what pins it is in scope when the Checks demand it. An operator instruction outranks a peer's request — ask him once, else cite it.
- A force-push dismisses approvals, so re-request review. Keep the rebase honest: gate, update the body's SHA, `git commit --amend`, `git push --force-with-lease`.

## One gate, not two

- Before adding a CI workflow, check `git show origin/main:.github/workflows/`. If `main` runs the same gate, add the missing steps to its file and delete yours.
- Delete the stopgap guard with it: a guard that exits 0 while the tree has no code is dead once the code lands, and its comment becomes a lie in the same commit.
- Confirm one job, not two, with `gh pr checks <n>`. The surviving workflow earns no AGENTS.md map line: a map names what a reader must find.

## When the operator rules a committed file out of the tree

- A host-specific file — a configuration naming absolute paths and this host's agents — becomes an example section in `README.md`; the path goes into `.gitignore`, and a test extracts that fenced block and loads it through the real loader so the example cannot rot.
- Amend the documents that claimed it was committed (an ADR's context and consequences) in the same pull request, with the operator's go-ahead — the edit is a question first.

## When the operator cuts a promised feature

- Move the product doc first: remove the promise, its acceptance line and its consequences from PRODUCT, and the same from SYSTEMS and README.
- An accepted ADR is not edited. Add the next numbered record: the decision, the clauses it overrides, and what the person loses. Name the override in the pull request.
- Delete the dead code and its tests in the same change: a removed flow leaves no helper, store read or fixture behind.

## A peer in the same clone, and a PR that merges under you

- Confirm the branch and PR before staging and before pushing: `git fetch`, `git log --oneline -3`, `gh pr view <n> --json state,headRefOid,mergedAt`. A peer can commit under your identity; stage named paths only.
- If the PR merged while you worked, a commit on its branch is not delivered: branch from `origin/main`, cherry-pick, open a new PR. Never force-push the merged branch.
- A push after a merge prints success; only `mergedAt` and the commit on `origin/main` prove delivery.
