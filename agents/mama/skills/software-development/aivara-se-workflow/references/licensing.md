# Licensing a repository

The organisation carries no default licence: each repository states its own. The absence of one is not permissiveness — the copyright holder reserves every right, whatever a public repository suggests.

## Establish the state first

- `gh repo view <owner>/<repo> --json licenseInfo` answers `null` when GitHub detects none; the REST `repos/<owner>/<repo>/license` endpoint 404s for the same reason.
- Confirm in the fetched tree, not the working copy: `git ls-tree -r --name-only origin/main | grep -iE 'licen[cs]e|copying'`.
- `git grep -niE 'copyright|licen[cs]e' origin/main` finds a holder line, a badge, or an old claim. Another repository being licensed (or not) is not evidence about this one; check each.

## The decision is an ADR

- One record per repository, next number, short: Context (public repository, how versions ship, what the absence means), Decision (the licence, the file, the holder line), Consequences (withdrawal, and what the notice does not reach).
- A record cites only earlier ADRs, so two repositories licensed in the same change carry two records that do not link each other.
- Holder line: `Copyright (c) <year> AIvara`, the year the licence lands. It is the one value no document fixes — state it in the pull request body as the assumption, with the one-line revert if the operator names a legal entity or a person.

## The files, in one documents-only pull request

- `LICENSE` at the root, the licence's own text verbatim, unmodified and untranslated — GitHub detects a licence only from a root file whose name and body it recognises.
- A two-line `## License` section in the README linking the file.
- The manifest's field where one exists: `"license": "MIT"` in `package.json`. Leave `"private": true` alone — it stops an npm publish and is not a licence.
- The ADR. No entry-file structure map entry: a root licence is plumbing whose purpose is obvious.

## What the record must say out loud

- **Third-party material keeps its own licence, and the record names it**: bundled fonts under the SIL Open Font License with their text already in the tree, a vendored library under its own. The new licence covers what the repository's authors wrote.
- **A licence cannot be withdrawn from what is already out.** Tags cut before the commit hold no licence file and are not rewritten; the grant runs from this commit, and earlier releases are reported to the operator as unlicensed rather than backfilled.
- **A compiled artifact does not embed the notice.** The release archive carries the build, the notice travels with the source, and putting the text inside the bundle is a packaging decision — name it out of scope, never claim it done.

## Verify and land

- The repository's gate for its language, `git diff --check` (an appended section commonly leaves a blank line at EOF), and a link check over the added documents: every relative link resolves to a file in the tree.
- Reviewer `thani-sh` alone: a licence change is documents-only, not implementation, so `--reviewer thani-sh` and reading `reviewRequests` back.
- GitHub reads the licence from the default branch, so `licenseInfo` still answers `null` on the pull request's branch and updates only after the merge — do not read that as a failure.
