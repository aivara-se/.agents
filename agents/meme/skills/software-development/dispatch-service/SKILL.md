---
name: dispatch-service
description: Use when changing aivara-se/dispatch.
author: MeMe
license: MIT
metadata:
  hermes:
    tags: [go, aivara, dispatch, git, pull-requests]
    related_skills: [coding, testing, review, github]
when-to-use: Any code, test, ADR-following, stacked-PR or tagging work in aivara-se/dispatch.
---

# Dispatch service

Go, standard library only, module `github.com/aivara-se/dispatch`. `internal/receiver` verifies deliveries and wakes agents; `cmd/dispatch` wires it; `internal/run`, `internal/audit` and `internal/config` are the rest.

## Specs and versions

- **The documents are the spec:** `docs/PRODUCT.md` (changelog), `docs/SYSTEMS.md`, `docs/adrs/`. Design PRs merge before code; while implementing, do not edit them, and say in the code PR that they were left out.
- **One PR per version.** Build only the version named. An ADR's clauses are the scope; its edge-case list is out.
- **The changelog moves in a separate docs commit after the code lands**, with README and AGENTS.md. That work is prose that counts or refuses:
  - the intro's "carries N flows", the fixed reason sentences, the acting deliveries;
  - `What vX does not do` and `Edge cases vX leaves unhandled`: a bullet saying "only X is read", or that a refusal wakes nobody, goes false first — delete it, add the new version's gaps;
  - the Acceptance bullets, subscription list, storage lines, `SYSTEMS.md`'s payload-field sentence, README's summary and delivery paragraph.
- Check every reason string in `SYSTEMS.md` against the strings `receiver.go` builds: a count and a list that disagree are one defect.
- **`PRODUCT.md` and `SYSTEMS.md` carry per-section word caps** (Behaviour 250, Scope 110, Architecture 180) and the org checker enforces them: run `bun run scripts/validate-docs.ts <repo> --require` in `~/github/aivara-se/dotgithub` before pushing. Behaviour sits at its cap, so a new rule is bought by folding a restated rule into the general one it repeats, not by writing longer bullets.
- `AGENTS.md`'s _Current Project Focus_ is the operator's steering, not docs catch-up: name its stale lines in the PR body. Its _Repository Structure_ map is the opposite — fix a line the change falsifies in the same PR.

### What is built

- **Read built state from code and release, never tags.** A release tags `VERSION` (`vX.Y.Z`), so later versions ride the release tag. Read `decide`/`payload` in `internal/receiver/receiver.go`, confirm with `git log -S <symbol> -- internal/receiver/receiver.go`, run its tests. Never read state off `receiver_test.go`: a type there is often a negative test for a refused flow.
- **"Implement vX" can name a version already on `main`.** Prove the flow absent first; if it exists, answer with the commit, its release (`git describe --tags --contains <sha>`) and its tests passing by name — a missing tag is not missing code.
- **Check the version's open docs PRs** before implementing and before opening code PRs: a review fix or new ADR can rewrite its contract (`git diff origin/main <docs-branch>`); if it disagrees with `main`, build to `main` and name the proposal. **"What is left" starts with a refresh:** `git fetch --all --tags --prune`, then `git checkout main && git merge --ff-only origin/main`.

## Implementing an ADR

- Add the delivery's fields to `payload`, its predicate to `decide`, its reason string exactly as the ADR writes it. Reuse dedup, counter, actor rule and roster match.
- Flows that add no count skip both counters in the cap guard; review-cap rules name only `review_requested` and `changes_requested`.
- Multi-wake flows record one audit line with profiles comma-joined (`mama,meme`); the record has one profile field.
- **One line has one `reason`.** With two target kinds (a review's author, the logins its body names), the line carries the first target's reason and each run keeps its own in its argv. Order author-first, pin the recorded reason, name the reading in the body.
- **A new kind of line is shaped by omission, not a `kind` field.** `audit.Record`'s delivery fields carry `omitempty`, so a run line and a boot line say only what they are. A fact needed at zero cannot be a `bool` under `omitempty`: `dirty` is the string `"true"`/`"false"`/`"unknown"`. A test marshals the line and asserts the key set.
- **A promise about a line that cannot be rewritten is a hop, not an edit.** The audit is append-only, so deferring a line costs the crash trace the ADR's Consequences rely on. Add one line when the fact becomes true — a new `decision` value, `superseded` — plus an ADR naming where the old clause stops. Call it at both hold sites, `decide` and `wakeTargets`, one line per profile: the multi-profile path replaces per profile, so a single-site fix passes the single-key test.
- **Every clause and guard needs a test that reddens when it goes.** MaMa mutates code when reviewing: cover action, state, draft, association, cap, bounded match, actor, unconfigured login. End-to-end tests post one signed delivery per flow, plant a sentinel in every text field, assert the whole argv.
- **The source tag is Hermes's.** `--source` takes `cli`, `tui`, `gui`, `acp`, `tool`, `oneshot`; anything else fails `session.create` with `4001 invalid_params` and the child dies before its first turn. A wake is `tool`, the hidden third-party label; provenance stays in the reason's `Dispatch: ` prefix and the audit line.
- **A new configuration field is a decision before it is a line.** `004` fixes the document's shape and calls a fifth field a decision: ship it with its own ADR naming the clause it spends, never an edit to `004`. Every document holding the shape gains it — the README example (its test parses that block), `config_test.go`'s fixture, every inline JSON in a test. Every field is required, so a missed one is a boot refusal.
- **A new argv field widens a signature.** `run.Runner.Start` is implemented by the real runner and both hand-rolled runners in `receiver_test.go`: change all three or the package stops compiling in a file you never opened. Derive the session title from the delivery (`<repository>#<number>`, `<repository>@<branch>`); store nothing. Record it in the stub's `call` struct and every `call` literal — the flow tests compare whole calls, the follow-up compares `calls[1]` with `calls[0]`.

### Payloads and trust guards

- **`author_association` is surface-dependent, never a whole guard.** On `pull_request_review` and `pull_request_review_comment` GitHub reports `CONTRIBUTOR`, sometimes `NONE`, for accounts whose `issue_comment` payload says `MEMBER`, so the guard is inert where it was widened. Judge a review's author from `review.user.login` / `comment.user.login` against `pull_request.user.login` and `pull_request.requested_reviewers`, with association as fallback (`docs/adrs/021-a-reviews-mention-is-trusted-by-its-author.md`).
- **Check the payload schema before adding an API call.** `simple-pull-request` carries `requested_reviewers`, `user`, `draft`, `auto_merge`, `merged_at`: `curl -s https://raw.githubusercontent.com/octokit/webhooks/main/payload-schemas/api.github.com/<event>/<action>.schema.json`. `pull_request_review` uses the simple schema, `pull_request_review_comment` the full one.
- **A guard change is a trust-boundary decision with its own ADR**, merged before the code, widening or narrowing the old clause by name. Its _Consequences_ state the case the rule admits — a stranger's own pull request — and the field that would close it, even when that clause is deliberately not taken.

### Mutation check before the PR

Do the pass yourself, per version, before pushing.

- **Commit before mutating.** Replace one clause with `true`/`false`/`""`, run only the test that should catch it, restore with `git checkout -- <file>`, read `RED` or `STILL GREEN`. `git checkout --` restores HEAD, so on an uncommitted tree it deletes the fix under test; grep the restored file for the original token. `scripts/mutation-pass.sh <file> <old> <new> <test-regex> [package]` runs one pass: it refuses unless the token occurs once, restores, prints the verdict.
- **A clause masked by an earlier flow's precedence never reddens a reason test.** `decide` checks flows in order, so an overlapping predicate lets the earlier case win. Pin it with a budget test: spend the other flow's limit first, assert the new flow still wakes.
- **A dedupe test only reddens if its fixture yields the same login twice:** name the author in the body so the login appears in both lists. A test asserting a run was _not_ started still passes when a clause goes if the flow refused for another reason: assert the `why` string too, and expect to rewrite those strings when a blank delivery starts acting.

### Tests around the exit callback and the audit

- The real `run.Runner` waits in a goroutine, so the delivery line lands before the run's; a stub calling `onExit` inside `Start` writes them the other way. Find records by field (`Exit != 0`), never by index. With several profiles woken at once, give the stub a non-zero exit and assert one line per profile — a callback closed over the wrong target passes a single-profile test only.
- **A dedup-key change is a fixture change across the suite.** `receiver_test.go` replays one body under many delivery ids (caps, holds, replacements); keying dedup on the body collapses them. Teach `post` to stamp the delivery id into the bytes before signing (`stamp`), keep `postSigned` for the signature table, write the new dedupe tests against `postSigned` — with a stamped body, a key of id-plus-digest passes them and the mutation stays green.
- Probe the exit status with a real child (`/bin/true`, `/bin/false`), not `exitCode` alone.

Gate before pushing:

```sh
gofmt -l .        # empty
go vet ./...
GOTMPDIR=$HOME/.cache/go-tmp go test -count=1 ./...
git diff --check
```

`/tmp` is noexec here, so an unset `GOTMPDIR` fails every test binary `permission denied`; create it with `mkdir -p "$HOME/.cache/go-tmp"`.

## Branch, PR and stack

- Branch `feat/<version-slug>` off the previous version's branch when versions stack; base the PR there and say "stacked on #<pr>, merge bottom-up". GitHub retargets the next PR when its base lands; merging is the operator's job.
- Conventional single-line commits. Review from `thani-sh` and `thani-sh-mama`; `gh pr create` can land the PR and fail the reviewer write, so read `reviewRequests` and repair with `gh pr edit <n> --add-reviewer thani-sh,thani-sh-mama`.
- **Commit by path.** The tree often carries an untracked `.pr-body.md`, and `git add -A` folds it in. Read `git show --stat HEAD` before pushing; if it slipped in, `git rm --cached .pr-body.md && git commit --amend --no-edit`.
- **Missing test or clause, found after a later version branched?** While the stack is unpublished, amend that branch and fold it in, then `git rebase --onto <new-tip> <old-tip> <branch>` per later branch, and re-run the gate on all heads. Published branches follow _Answering a review finding_ and _Resolving stack conflicts_.
- Never commit to `main`; never force-push a branch with a standing review unless a rebase is the only fix, and say so.

## Answering a review finding

- **A review fix is a new commit, not an amend.** The body's "Verified at `<sha>`" and the review name the reviewed head; an amend leaves them disagreeing. Commit, push, then move the body's hash. Fix the body in the same push: a "Left out" clause naming the finding goes false once fixed — delete it, keep the clauses still out.
- **Re-request the reviewer who blocked:** `gh pr edit <n> --add-reviewer <login>` on the `CHANGES_REQUESTED` author; only their review or a dismissal clears it. `mergeStateStatus: BLOCKED` after a green push is that gate, not a broken branch.
- **An approval-gated file needs the operator, not another route.** `AGENTS.md` edits prompt for consent; a timed-out prompt is silence, not a refusal and not licence to edit another way. If it blocks twice, name the exact old and new line and stop.
- Run the full gate and wait for CI on a docs-only line too, then answer with the evidence command and head sha — a grep that now returns nothing is the shortest proof.

## Resolving stack conflicts

After the base merges, `main` carries it as rewritten commits, so the next branch conflicts. Merge `origin/main` in; do not rewrite the branch.

- `receiver.go`: keep the branch version — it is the superset.
- `receiver_test.go`: never take one side whole. Check out `main`'s file, re-apply this version's test patch (`git diff <parent> <version-commit> -- ..._test.go`) plus later review fixes, or main's newer tests are silently deleted. Verify with `git diff --cached origin/main` showing only this version's additions, then run the full gate on the merge tree.

## Rebasing an open branch

`BEHIND` with no conflict is a plain rebase. For a branch whose merge commits make rebase-and-merge refuse, rebuild linear: `git checkout -B feat/<slug> origin/main`, cherry-pick `<version-commit>` and its review fixes, then `git push --force-with-lease origin feat/<slug>`.

- Take the branch from `gh pr list --state open` and `git worktree list`, not the operator's link: the link can name a merged parent while the live branch is its follow-up in its own worktree. Run `git status` there first — another session may share the clone — then gate and confirm `git diff --stat origin/main..HEAD` is only this change.
- Force-push only while no review has landed, and update the body's "Verified at `<sha>`". `BLOCKED` right after the push is the review gate and queued checks, not a broken branch.

## Tags

A release is one annotated `vX.Y.Z` tag cut from `VERSION` on a push to `main` (`025`), not one per version: bump `VERSION`, let CI tag it, never hand-create `vX.Y` tags. The operator owns deploys.

## Boundaries

- **The site's Dispatch page** (`aivara-se/.website`, `/dispatch`) is value copy, not a changelog: that repo's `PRODUCT.md` forbids mechanisms, limits and record formats, and `projects.ts` carries no status or version. Only a claim the version falsifies touches it. `git fetch` and read `main` (that clone is often on an old branch), hold each sentence against the new behaviour, and `curl -sL https://aivara.se/dispatch/` to confirm the deployed page.
- The organisation webhook subscription (new events) and the host deploy are the operator's. The service calls no GitHub API, holds no credential, keeps no state beyond the audit file.
