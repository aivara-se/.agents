---
name: dispatch-service
description: Use when changing aivara-se/dispatch.
version: 1.0.0
author: MeMe
license: MIT
metadata:
  hermes:
    tags: [go, aivara, dispatch, git, pull-requests]
    related_skills: [coding, testing, review, github]
when-to-use: Any code, test, ADR-following, stacked-PR or tagging work in aivara-se/dispatch.
---

# Dispatch service

## When to Use

- Implementing a merged ADR or roadmap version as Go code and tests.
- Stacking one PR per version and resolving the conflicts after a base merges.
- Creating the annotated version tags.

Go, standard library only, module `github.com/aivara-se/dispatch`. The receiver that verifies deliveries and wakes agents lives in `internal/receiver`; `cmd/dispatch` wires it, `internal/run`, `internal/audit`, `internal/config` are the rest.

## Specs and versions

- `docs/PRODUCT.md` (changelog + roadmap), `docs/SYSTEMS.md` and `docs/adrs/` are the spec. Design PRs merge before code; the documents are not yours to edit when implementing one, and the code PR says they were left out.
- One PR per version. Implement only the version named; do not pull the next roadmap item in. An ADR's clauses are the scope — its edge-case list is explicitly out.
- The changelog and roadmap move in a separate docs commit after the code lands; README and AGENTS.md follow there too. The relabelling is the easy half — most of the work is prose that counts or refuses:
  - the intro's "carries N flows" and the list after it, the number of fixed reason sentences, and the number of acting deliveries;
  - `What vX does not do` and `Edge cases vX leaves unhandled`: a bullet that says "only X is read", or that a refusal wakes nobody, is the first to go false — delete the false clause and add the new version's known gaps (a dismissal pairing, a run on a third branch);
  - the Acceptance heading and every bullet it holds, the subscription list, the storage lines and `SYSTEMS.md`'s payload-field sentence;
  - README's summary, event list and delivery paragraph, which restate PRODUCT and drift separately.
  Check every reason string in `SYSTEMS.md` against the strings `receiver.go` builds — a count and a list that disagree are the same defect.
  `AGENTS.md`'s *Current Project Focus* is the operator's steering, not the docs catch-up: name its stale lines in the PR body instead of editing it. Its *Repository Structure* map is the opposite — a line the change falsifies (`the delivery-id cache lives here`) is fixed in the same PR, as the file's own contract line demands.

### What is built

- Built means an annotated tag `vX.Y` is pushed. The pending list is every roadmap line from the first untagged version on — `docs/PRODUCT.md`'s *Roadmap* header says as much; do not derive it from the changelog's wording or from the code alone.
- Never read implementation state off `receiver_test.go`: an event or action type appearing there is often a negative test for a flow the receiver refuses, so grep `internal/receiver/receiver.go`'s `decide`/`payload` for the field before claiming a version is missing or present.
- Before implementing a version, and again before opening its code PRs, check open docs PRs for it: a review fix or a new ADR can rewrite its contract (reason string, actor rule, a consequence) after the original docs already sit on `main`. `git diff origin/main <docs-branch>`, read the body; if it disagrees with `main`, build to `main` and name the open proposal in the body rather than coding against an unmerged change.
- Answering "what is left" starts with a refresh: `git fetch --all --tags --prune`, then `git checkout main && git merge --ff-only origin/main`. The working copy is routinely left detached on a docs commit or behind `origin/main`.

## Implementing an ADR

- Add the delivery's fields to `payload`, its predicate to `decide`, and its reason string exactly as the ADR writes it. Reuse the existing flow: dedup, counter, actor rule, roster match.
- New flows that add no count must skip both counters in the cap guard; review-cap rules name only `review_requested` and `changes_requested`.
- Multi-wake flows record one audit line with profiles comma-joined (`mama,meme`); the record has one profile field.
- **One line still has one `reason`.** When a delivery has two kinds of target with different reasons (a review's author and the logins its body names), the line carries the first target's reason and every run keeps its own reason in its own argv. Order the targets author-first, pin the recorded reason, and name the reading in the PR body.
- **A new kind of line is shaped by omission, not by a `kind` field.** `audit.Record`'s delivery fields carry `omitempty` so a run line (delivery, profile, exit) and a boot line (`boot` object) say only what they are. A fact that must appear even at its zero value cannot be a `bool` under `omitempty`; `dirty` is the string `"true"`/`"false"`/`"unknown"` for that reason, and a test marshals the line and asserts the key set.
- **A promise an ADR makes about a line it cannot rewrite is a hop, not an edit.** An ADR can promise that a line names something that does not exist yet when the line is appended (the replaced delivery naming its replacement), and the audit is append-only. Deferring the first line to name it costs the crash trace the same ADR's Consequences rely on, so the fix is one more line at the moment the fact becomes true — a new `decision` value, `superseded` — plus a new ADR that states where the old clause stops. Call it at *both* hold sites, `decide` and `wakeTargets`, one line per profile: the multi-profile path replaces a delivery per profile and the single-site fix passes the single-key test.
- Every predicate clause and guard needs a test that turns red when the clause is removed — MaMa reviews by mutating the code and expects a named test to fail. Add a case for each: action, state, draft, association, cap, bounded match, actor, unconfigured login.
- End-to-end tests post one signed delivery per flow, plant a sentinel in every text field, and assert the whole argv so no payload text reaches the reason.
- **The source tag is Hermes's, not ours.** `--source` accepts `cli`, `tui`, `gui`, `acp`, `tool`, `oneshot`; any other value fails `session.create` with `4001 invalid_params` and the child exits before its first turn. A wake is `tool` — the label for third-party integrations, hidden from user pickers — and Dispatch provenance stays in the reason's `Dispatch: ` prefix and the audit line, which the body names when the tag changes.
- **A new configuration field is a decision before it is a line.** `004` fixes the document's shape and says a fifth field is a decision, so a field the operator asks for lands with its own ADR in the same PR — a new ADR that names the clause it spends, never an edit to `004`. Every document holding the shape gains the field: the README example (its test parses that block), `config_test.go`'s fixture, and every inline JSON in a test — every field is required, so a missed one is a boot refusal.
- **A new argv field widens a signature, not just a command.** `run.Runner.Start` is implemented by the real runner and by both hand-rolled runners in `receiver_test.go`; give the parameter to all three or the package stops compiling in a file you never opened. The session title is the object the gate already holds — `<repository>#<number>`, `<repository>@<branch>` — so derive it from the delivery and store nothing. Record it in the stub's `call` struct and every `call` literal: the flow tests compare whole calls and the follow-up compares `calls[1]` with `calls[0]`, so both paths pin the new argument without a new test.

### GitHub's payloads and trust guards

- **`author_association` is surface-dependent, so it is never a whole guard.** On `pull_request_review` and `pull_request_review_comment` GitHub reports `CONTRIBUTOR`, sometimes `NONE`, for accounts whose `issue_comment` payload says `MEMBER` — the field is computed against a different thing on each surface. A mention guard that trusts it alone is inert on exactly the surfaces it was widened to. Judge a review's author from `review.user.login` / `comment.user.login` against `pull_request.user.login` and `pull_request.requested_reviewers`, and keep the association as a fallback (`docs/adrs/021-a-reviews-mention-is-trusted-by-its-author.md`).
- **Check the payload schema before concluding a rule needs an API call.** `simple-pull-request` carries `requested_reviewers`, `user`, `draft`, `auto_merge` and `merged_at`, so the identities and states most rules need are already in the delivery: `curl -s https://raw.githubusercontent.com/octokit/webhooks/main/payload-schemas/api.github.com/<event>/<action>.schema.json`. Read which schema each event's `pull_request` points at — `pull_request_review` uses the simple one, `pull_request_review_comment` the full one.
- **A guard change is a trust-boundary decision and gets its own ADR**, merged before the code, that widens or narrows the old clause by name and never edits it. Its *Consequences* must state the case the new rule admits — a stranger's own pull request, say — and the payload field that would close it, even when that clause is deliberately not taken.

### Mutation check before the PR

Run the mutation pass yourself, per version, before pushing — do not assume a table test covers a clause because it looks like it should.

- Script it: on a **committed** tree, replace one clause with `true`/`false`/`""`, run only the test that should catch it, restore with `git checkout -- <file>`, print `RED` or `STILL GREEN`. `git checkout --` restores HEAD, so on an uncommitted tree it deletes the fix you are testing and the next red is for the wrong reason; commit first, and grep the restored file for the original token before trusting the run. One pass over every new clause takes minutes and is the strongest statement the PR body can make. `scripts/mutation-pass.sh <file> <old> <new> <test-regex> [package]` does one: it refuses unless the token occurs once, runs only that test, restores with `git checkout --`, and prints `RED` or `STILL GREEN`.
- **A clause masked by an earlier flow's precedence never reddens a reason test.** `decide` checks flows in order, so a new predicate that overlaps an existing one still lets the earlier switch case win the reason; deleting the overlapping clause changes only the counters. Pin that clause with a budget test — spend the *other* flow's limit first and assert the new flow still wakes — not with a reason assertion.
- **A dedupe test only reddens if its fixture produces the same login in two lists.** When a delivery builds targets from the payload and from the text, name the author in the body so the login appears twice; a payload that names each login once makes the dedupe unreachable and the mutation stays green.
- A test asserting that a run was *not* started still passes when a clause is deleted if the flow refused for another reason; assert the `why` string too, and expect to rewrite those strings when a previously blank delivery legally starts acting.

### Tests around the exit callback and the audit

- The real `run.Runner` waits in a goroutine, so the delivery's line is appended before the run's. A stub that calls `onExit` inside `Start` writes them in the opposite order: find records by field (`Exit != 0`), never by index.
- Pin the run line's shape by marshalling it and asserting the key set — `omitempty` is the mechanism that keeps `event`, `decision` and `answer` off it, and struct equality cannot see a field that reappears.
- With several profiles woken at once, give the stub a non-zero exit and assert one line per profile: a callback closed over the wrong target passes a single-profile test and fails only here.
- **A dedup-key change is a fixture change across the whole suite.** `receiver_test.go` replays one body string under many delivery ids to simulate repeated events (caps, holds, replacements); keying the dedup on the body collapses all of them. Teach `post` to stamp the delivery id into the bytes before signing (`stamp`), keep `postSigned` for the signature table, and write the new dedupe tests against `postSigned` — with a stamped body, a key of id-plus-digest passes them too and the mutation stays green.
- Probe the exit status with a real child (`/bin/true`, `/bin/false` as the configured binary) instead of trusting `exitCode` in isolation.

Gate before pushing:

```sh
gofmt -l .        # empty
go vet ./...
GOTMPDIR=$HOME/.cache/go-tmp go test -count=1 ./...
git diff --check
```

This sandbox mounts `/tmp` noexec, so an unset `GOTMPDIR` makes every test binary fail `permission denied` before it runs; create the directory once with `mkdir -p "$HOME/.cache/go-tmp"`.

## Branch, PR and stack

- Branch `feat/<version-slug>` off the previous version's branch when versions are stacked; PR base = that branch, body says "stacked on #<pr>, merge bottom-up". GitHub retargets the next PR to `main` when its base lands. Merging is the operator's job.
- Conventional single-line commits. Request review from `thani-sh` and `thani-sh-mama`.
- **Commit by path.** The tree routinely carries an untracked `.pr-body.md` from the last PR, and `git add -A` folds it into the version commit. Read `git show --stat HEAD` before pushing; if it slipped in, `git rm --cached .pr-body.md && git commit --amend --no-edit`.
- `gh pr create` can land the PR and fail the reviewer write; read `reviewRequests` on every PR after creating it and repair with `gh pr edit <n> --add-reviewer thani-sh,thani-sh-mama` before moving on.
- Found a missing test or clause after a later version branched off? While the stack is unpublished, fold it into the right commit instead of adding a second one: amend that branch, then `git rebase --onto <new-tip> <old-tip> <branch>` for each later branch, and re-run the full gate on all six heads. Published branches follow *Answering a review finding* (new commit) and *Resolving stack conflicts* (merge, never rebase) instead.
- Never commit to `main`; never force-push a branch with a standing review unless a rebase is the only fix, and say so.

## Answering a review finding

- **A review-fix is a new commit, not an amend.** The review's evidence and the body's "Verified at `<sha>`" both name the reviewed head; amending rewrites it and leaves the two disagreeing. Commit, push, then move the body's hash to the new head.
- **Fix the body in the same push.** A "Left out" clause that names the finding is false the moment it is fixed — delete it, and keep the clauses that are still out. A body that still records a defect as deferred contradicts the diff and gets re-requested.
- **Re-request the reviewer who blocked, not just the operator.** `gh pr edit <n> --add-reviewer <login>` on the `CHANGES_REQUESTED` author; only their review or a dismissal clears it. `mergeStateStatus: BLOCKED` after a green push is that gate, not a broken branch.
- **An approval-gated file needs the operator present, not another route.** `AGENTS.md` edits prompt for consent; a timed-out prompt is silence, not a refusal of the change and not a licence to edit it by another path. When the operator says he will approve, write it in that session; if it blocks again, name the exact old and new line and stop.
- Run the full gate and wait for CI on a docs-only line too, then answer the review with the evidence command and the head sha — a grep that now returns nothing is the shortest proof the finding closed.

## Resolving stack conflicts

After the base version merges, `main` carries it as rewritten commits, so the next branch conflicts.

- Merge `origin/main` into the version branch rather than rewriting it.
- `receiver.go`: keep the branch version — it is the superset (older versions plus this one).
- `receiver_test.go`: never take one side whole. Check out `main`'s file, then re-apply only this version's test patch (`git diff <parent> <version-commit> -- ..._test.go`) plus later review-fix commits; otherwise main's newer tests are silently deleted. Verify with `git diff --cached origin/main` showing only this version's additions.
- Run the full gate on the merge tree before pushing.

## Rebasing an open branch

A branch that GitHub reports `BEHIND` with no conflict is rebased; the section below is for one whose merge commits make rebase-and-merge refuse.

- Take the branch from `gh pr list --state open` and `git worktree list`, not from the operator's link: the link can name a merged parent while the live branch is its follow-up, checked out in its own worktree.
- `git status` in that worktree first — another session may share the clone — then `git rebase origin/main`, re-run the full gate, and confirm `git diff --stat origin/main..HEAD` is still only this change.
- `git push --force-with-lease` while no review has landed; a standing review makes the rebase a thing to say in a comment, not a silent push.
- The rebase rewrites the commit the body's "Verified at `<sha>`" names, so update that hash. `mergeStateStatus: BLOCKED` straight after the push is the review gate and queued checks re-running, not a broken branch.

## Making GitHub's rebase-and-merge work

Merge commits and already-merged version commits make GitHub refuse to rebase. Rebuild the branch linear on `main`:

```sh
git checkout -B feat/<slug> origin/main
git cherry-pick <version-commit> [<review-fix-commit> ...]
git push --force-with-lease origin feat/<slug>
```

Confirm `git diff --stat origin/main..HEAD` is only this version, and the gate is green.

## Tags

One annotated tag per version, created when the code lands: `git tag -a vX.Y -m "Dispatch vX.Y: <one sentence>" <last code commit of the version>`. Point it at the final code/test commit, not the later docs commit. Push the tags explicitly; the operator owns deploys.

## Boundaries

- The site's Dispatch page (`aivara-se/.website`, `/dispatch`) is value copy, not a changelog: that repository's `PRODUCT.md` forbids mechanisms, limits and record formats in a project page, and `projects.ts` carries no status or version. A version that adds a flow, a reason or an audit line does not touch it; only a claim the version falsifies does. The check is cheap: `git fetch` and read `main` (that clone is routinely left on an old topic branch), hold each page sentence against the new behaviour, and `curl -sL https://aivara.se/dispatch/` to confirm the deployed page is the tree you read.
- The organisation webhook subscription (new events) and the host deploy are the operator's, not the service's. The service calls no GitHub API, holds no credential, keeps no durable state beyond the audit file.
