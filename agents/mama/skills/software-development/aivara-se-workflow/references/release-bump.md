# Cutting a release

The standard is `aivara-se/.github/docs/RELEASES.md`: the version is a number in a file, and the push that changes it is the release. This file is the repository-level pass — which document lines move, which must not, the gate, and the pull request.

## First: "are there unreleased changes?"

1. `git fetch --tags --prune`, then read the fetched refs. The canonical clone can sit dozens of commits behind while `origin/main` is the truth.
2. Find the newest tag (`git tag --sort=-creatordate | head -1`) and read what is past it: `git rev-list --count v<tag>..origin/main`, `git log --oneline v<tag>..origin/main`.
3. The version file still holding the released number is the proof. A release is a push that moves it, so an unchanged file means everything since the tag is unshipped, however many commits that is.
4. Group by type — `git log --no-decorate --format='%s' v<tag>..origin/main | cut -d: -f1 | sort | uniq -c` — and report what ships, not the count. A lone `feat` is a minor bump waiting; docs and CI alone mean there is nothing to release.
5. Read `gh pr list --state open` and `gh issue list --state open` in the same pass: merged-but-unshipped and still-in-flight are different answers.

## The bump

- **Read the Roadmap first.** The product document often already names the next number in a "recorded and not built" sentence; that number is the decision, not a guess. A `feat` since the last tag earns a minor bump; `fix`, `docs` and `ci` alone do not earn a release.
- Branch `chore/release-<x-y-z>` (dots to dashes) off `origin/main` in a `git worktree` under `$HOME`, one commit `chore: release <x.y.z>`. These repositories rebase-merge, so every commit lands: keep it single and final.
- `minTinyjsVersion`, the app `id` and the `$schema` do not move.

## Which lines move

`git grep -n '<old version>' origin/main` before the edit, `grep -rn` after. The string falls into three classes, and only two move:

- **Current-version sentences move.** "In v1.13 the app makes no network request", "and v1.13 has none", "v1.13 keeps every one" in `PRODUCT.md`; "No network. v1.13 …" and "The app above is v1.13" in `SYSTEMS.md`.
- **The changelog entry is history.** The old version's line stays exactly as written. A blind replace of every occurrence rewrites the record; check that the surviving match is the changelog's own.
- **The Roadmap takes the new number** and loses its "recorded and not built: vX" sentence once that thing is built. Leave that sentence and the release ships a document saying its change is pending.

Add the new changelog line at the top: one sentence, the user-visible outcome first, ADR numbers left to the body documents — `- **v1.14** — <what the person sees>, <second change>.` Two shipped decisions share one line; the changelog is not a commit log.

An ADR is immutable once merged: a version sentence inside one, or a consequence the release falsifies, takes a new ADR, never an edit. Most releases need no ADR — the record is the version file and the changelog.

## Gate

`bun install --frozen-lockfile`, `bun fmt --no-script --check .`, `bun test`, `bun run build` in the app directory (it bundles the page, then compiles the backend, and needs the tinyjs toolchain in `~/.tinyjs`). Report the pass count from the run in front of you, not from the previous one. `/tmp` is noexec, so build under `$HOME`.

The publish run proves the platform matrix — macOS arm64 and x86_64, Windows, Linux — not this pass; say which is which.

## The pull request

- Title `Release <x.y.z>`, base `main`, and a single reviewer: the operator. A release changes the version file and documents, no code. Read the repository's previous release pull request (`gh pr view <n> --json title,body,reviewRequests,files`) and follow its shape rather than inventing one.
- Body: what merging releases (the commits since the last tag, grouped, the decisions named by ADR number), the document edits, the gate output with the commit it ran on, and what is not this pull request's work.
- Merging is the release: say it publishes on all three platforms, and that the pull request sits `BLOCKED` on the operator's approval, because GitHub refuses a self-approval.
- When the checks finish, grep the validate log for the tally and `Compiled` instead of trusting a green job name; the `changes` job is a path filter, not a build.

## Sequencing

- **The release and the next version's design rewrite the same Roadmap paragraph.** Land the release first. A design pull request opened before it reports `mergeStateStatus: DIRTY` on that line: rebase onto the release commit, and force-push with `--force-with-lease` only while no review exists. A reviewed branch is reissued, not rewritten.
- **Bump only a version whose code is on `main`.** The bump is the publish trigger: merging it builds whatever the tree holds, so an early bump ships an empty release and spends the number. Read `git log <tag>..origin/main` for the `feat` before you call the request premature — the code often lands before the version does.
