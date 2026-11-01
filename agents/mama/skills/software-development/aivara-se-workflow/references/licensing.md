# Licensing a repository

Each repository states its own licence. Absence is not permissiveness: the holder keeps every right.

## Establish the state

- `gh repo view <owner>/<repo> --json licenseInfo` answers `null` when GitHub detects none; the REST `repos/<owner>/<repo>/license` 404s too.
- Confirm in the fetched tree: `git ls-tree -r --name-only origin/main | grep -iE 'licen[cs]e|copying'`.
- `git grep -niE 'copyright|licen[cs]e' origin/main` finds a holder line, a badge or an old claim. Another repository's licence is not evidence.

## The decision is an ADR

- One per repository, next number: Context, Decision (licence, file, holder line), Consequences (withdrawal, reach).
- A record cites only earlier ADRs, so two repositories licensed together carry unlinked records.
- Holder line `Copyright (c) <year> AIvara`, the year it lands — no document fixes it. State it in the body, with the one-line revert if the operator names an entity.

## The files, in one documents-only pull request

- `LICENSE` at the root, verbatim: GitHub detects a licence only from a root file whose name and body it recognises.
- A two-line `## License` README section linking it.
- The manifest field where one exists (`"license": "MIT"`). Leave `"private": true` alone — it stops an npm publish and is not a licence.
- The ADR. No structure-map entry: a root licence is plumbing.

## What the record must say

- **Third-party material keeps its own licence, and the record names it**: bundled fonts under the SIL Open Font License, a vendored library under its own.
- **A licence cannot be withdrawn from what is already out.** Earlier tags hold no file and are not rewritten; the grant runs from this commit, and earlier releases are reported as unlicensed.
- **A compiled artifact does not embed the notice.** The archive carries the build; putting the text in the bundle is a packaging decision, out of scope.

## Verify and land

- The language gate, `git diff --check` (an appended section often leaves a blank line at EOF), and a link check.
- Reviewer `thani-sh` alone, with `reviewRequests` read back.
- GitHub reads the licence from the default branch, so `licenseInfo` answers `null` on the branch until the merge. That is not a failure.
