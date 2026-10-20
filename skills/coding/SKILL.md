---
name: coding
description: Code quality rules a formatter cannot enforce — structure, dependencies, scripts, error handling, public surface, and how a change is opened, armed and answered in review.
when-to-use: Any change to source code, or to the build and CI definitions around it. Read it before writing the first line, not after.
---

# Coding

Style is the language's own business: run the formatter and linter this repository already uses and do not argue with them. This skill covers what they cannot decide.

## The task and the spec

- When the operator says the design change is already merged and asks only that the implementation match it, the documents outrank the code and are not yours to edit: implement to them, keep the diff to the code and its tests, and say in the change that the documents were left out. A code path that contradicts the merged document is the thing to change, not the document. A design pull request that says a document such as the runbook "lands with the code" has not given you permission to edit it — name the stale lines in the pull-request body instead.
- **A merged design pull request does not mean the implementation exists.** Its body often names the handler and its tests as the pull request that follows. Confirm the behaviour is absent in the tree — `git log --oneline -- <source dir>` and read the handler the document names — before concluding that another agent already landed it.
- **Sync the base branch before reading the documents.** A design change merged on the remote is absent from a clone left on an older `main`: `git fetch` and `git pull --ff-only` first, and treat a missing ADR as a stale clone before concluding the decision was never recorded.
- **Implement in the order the architecture document numbers it.** When it gives a numbered flow, put each new check at the number the document gave it — dedup before a count, a count before matching the login — even when another placement reads more easily in the code. That order is what a reviewer compares the diff against.
- **An ADR's overrides clause is a deletion list.** The clauses it names stop being implemented; every clause it does not name still stands, so read the old ADR it cites beside the new one.
- **Reuse the record vocabulary the service already has.** A new outcome is a value in the existing reason field unless the design names a new decision constant, and each item the document's checks section says the tests must cover becomes a named test. A flow that wakes several targets still writes one record per delivery: keep the existing fields, let the singular one carry the list, and name that reading in the pull-request body.
- Build what the specification says. When two of its numbers cannot both be true — a maximum and a minimum that collide — do what the checkable requirement asks, get as close as you can on the rest, and say in the change what you picked and why.
- **Never** choose between two readings of a specification in silence. The reviewer sees the code but not the reading you dropped, so the choice belongs in the change.
- When the operator declares the documents frozen, a contradiction between them is a blocker, not a reading: name the file, the line and the smallest input that would settle it, and ask. Batch every blocker into one question — the answer to one may change which of the others still stand.
- An answer that permits a frozen document to change is an instruction to change it: make the smallest edit that removes the contradiction and name it in the pull-request body beside the reading it replaced. Never edit a frozen document the operator has not asked you to change, and never give a fact a second home.
- **Build the smallest thing the task asks for.** Not the design it could become, not the scope it hints at, not the edge case nobody has met. The work is incremental and the gaps are acknowledged: a gap you can name is a fact about this version, not a defect to close in passing — write it in the body or the card and leave it open. Where simplicity and completeness both meet the task, simplicity wins. A design pull request that lays out a roadmap of versions is not an order for every version at once: build the first one the roadmap calls unbuilt, and name the later ones as deferred in the body.
- **A rare edge case is not a requirement.** Handle what the acceptance criteria name and what an ordinary caller reaches. A case that needs a new concept, a field or a guard to serve is recorded, not implemented — unless the ordinary caller reaches it and it throws, corrupts or loses data, which makes it the boundary the task already owns.

## Structure and size

- One responsibility per function, module and file. Prefer small, single-purpose units that return early over deep nesting.
- **Never** leave dead code: no commented-out blocks, no unreachable branches, no unused exports, no TODO without a name attached. The history is in git; delete rather than comment out.
- YAGNI before DRY: do not invent an abstraction until the third real copy exists. Two similar blocks with different reasons to change are allowed to stay similar — but a copy that differs only in a constant is the same mechanism with a parameter, so give the existing type the parameter at the second use instead of copying it.
- **When a new flow joins an existing handler, walk every piece of state the handler touches and decide for each whether the new flow uses it.** A delivery-id cache is shared by every flow; a counter keyed by repository and number is not — an issue and a pull request can carry the same number, so a flow that must not use the counter needs the check guarded, not only the increment. Pin it with a test where an entity of the new kind carries the number the old kind has already maxed.
- A file that needs a table of contents wants splitting; a function that needs a comment to explain its middle wants extracting.

## Dependencies

- The standard library or the runtime first. Every new dependency is a maintenance and supply-chain cost: justify it in the pull request body or do not add it.
- **Never** add a second package manager, a second lockfile, a second formatter, or a second test runner. The toolchain is the one the repository already uses.
- Dependencies are added for a reason that is written down, and pinned by the lockfile that the repository already commits.

## Scripts

- **A development-flow script is a Bun script.** Something that runs commands — a check, a build, a release, a data fix — is written in TypeScript and run with `bun run scripts/<name>.ts`, in the repository's own `scripts/` directory. **Never** Python. Prefer it over a bash shell script: past a handful of lines a shell script has no types, no argument handling and no error handling, and it fails differently on the next machine. A command typed at the prompt is not a script.
- A script is code and gets the same treatment as the rest of the change: fail loudly when it cannot do its job, no silent fallback, no secret printed, and any argument it needs named where the command is written down.
- **Never** leave a script that only one run needed. If it was a one-off, it was a command.

## Errors and data

- Fail explicitly. No silent fallbacks, no defaults that hide a missing required input, no catching an error only to log and continue.
- Validate at the boundary — user input, network, filesystem, environment — and trust the data inside the boundary.
- Error messages name the thing that failed and what was expected; they do not name the user's mistake in a way that blames them.
- **Never** log, print, commit or paste a secret, token, credential or personal datum — not truncated, not hashed-for-debugging, not in a test fixture.

## Public surface

- Keep the public API as small as it can be: private by default, public where another module genuinely needs it.
- Changing an existing public interface is a decision, not an edit. Say who consumes it and why the change cannot be additive.
- Every function, method, class and constant carries a block comment above it: what it is for, and anything the signature cannot say.
- **Never** a JSDoc block — no `@param`, `@returns`, `@typedef`. Types are the type system's job: in TypeScript the signature already is the type, and a JSDoc block only repeats it in prose and drifts from it.

## The pull request

- **One version, one pull request.** When the work is a sequence of decided versions, each version gets its own commit, its own branch based on the one before it, and its own pull request against that branch — a stack, merged bottom-up. Never fold two versions into one change because they share a handler; each diff is compared with its own record, and a stack keeps every review small.
- **Request the operator and one peer, chosen by what the change is.** `--reviewer thani-sh` on every pull request, plus **MaMa** where the change carries product or architecture — a document, an ADR, an interface between modules, a trade-off that is expensive to reverse; **MeMe or MiMi** where it is implementation, MeMe for code that has to last and MiMi for a measured change to speed or a new tool earning its place; **MoMo** where it warrants extra scrutiny — untrusted input, shared or concurrent state, a security boundary, a parsing or protocol surface, or a change you are not sure of yourself. A change that is both design and code asks MaMa and one engineer, and the body says in one clause why the peer it names is the right one.
- **Arm it for auto-merge as you open it.** `gh pr merge <n> --auto --rebase` leaves the approving review as the last act before the change lands. The ruleset still holds the line — branch up to date with the default branch, `validate` green on that head, one approval covering the last push — and arming removes only the wait for the click.
- **Never arm what must not merge**: a draft, a probe, a spike, a proof of concept, a branch opened to show an idea. Open those as a draft, which cannot be armed, and make the first line of the body say what it is and that it stays out.
- **Disarm the moment that stops being true** — the work is parked, the design is rejected, the operator asks for a hold: `gh pr merge <n> --disable-auto`. An armed pull request nobody is watching merges on the first approval it gets.

## After a review

- **A request for changes is a proposal, not an order.** Before you touch the branch, settle three things: is it true (reproduce it), is it inside the scope the task set, and does the fix it asks for buy more than it costs. One that fails any of the three gets an answer on the thread — the reproduction that shows it wrong, the line of the task that puts it out of scope, or the smaller fix that settles it — and the branch stays as it is. Name which of the three you are answering, in a line or two, and do not argue the review.
- **When it holds, apply it and ask that reviewer again**: `gh pr edit <n> --add-reviewer <login>`. The push clears the request, and the reviewer who asked is the one who settles it.
- **The push re-runs `validate` and dismisses the approvals**, so read `gh pr view <n> --json mergeStateStatus,statusCheckRollup` before you call it ready; an armed pull request lands itself the moment both are green again.
- **Rebase as the default branch moves**, because the ruleset requires the branch to be up to date: `git fetch origin && git rebase origin/main && git push --force-with-lease`, then re-request the review the push cleared.

## Pre-Completion Verification

Before you call a change done:

1. Run the formatter and linter this repository already uses — clean, with no suppressions you added for this change.
2. Run the checks this repository gates on, on the final tree — the whole sequence, not just the fast one. An editor or patch hook that lints one Go file reports `undefined:` for symbols from its own package because it lacks package context; that is not a build failure, and `go vet ./...` plus `go test ./...` on the tree is the verdict.
3. Read the diff once, top to bottom, as the reviewer will: no debug output, no stray files left behind, and an edit anchored on a declaration's opening line must repeat that line — an insertion that stops at `type X struct {` deletes it.
4. Take out everything the task did not ask for: no drive-by reformatting, no rename, no tidy-up, no unrelated fix. Where the human operator explicitly asked for one of them, name it in the pull-request body; anything else comes out before you push.
5. **A fix is the smallest diff that removes the cause.** Not a new check script, not a guard or a build-time gate, not a rewritten document, not a comment describing the change — and a comment or doc that has to change because of the fix is more likely the thing that should not have been there at all. Every file the fix did not have to touch is a file it must not touch.
