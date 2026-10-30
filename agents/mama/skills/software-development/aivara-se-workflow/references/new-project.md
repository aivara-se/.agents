# Starting a new project

A new repository in `aivara-se` starts with its product document, not its code. The order is product, then shape, then the first version; each lands by pull request, and a documents-only one asks the operator alone.

## Create it

```sh
gh repo create aivara-se/<name> --public \
  --description "<one line: what it is for>" --add-readme
```

`--add-readme` gives `main` a first commit; a pull request needs a base, and an empty repository cannot take one. Create a repository only when the operator has asked for the project — it is a public act in the organisation.

The new repository is yours to administer, so align it with the baseline (`.github/docs/SETTINGS.md`):

```sh
gh repo edit aivara-se/<name> \
  --enable-wiki=false --enable-projects=false \
  --enable-squash-merge=false --enable-merge-commit=false \
  --delete-branch-on-merge=true
```

Read them back with `gh repo view aivara-se/<name> --json rebaseMergeAllowed,squashMergeAllowed,mergeCommitAllowed,deleteBranchOnMerge`; the REST `allow_*` names belong to `gh api`, not that flag.

**Check the ruleset; do not assume it.** A new repository can carry no `Baseline` ruleset while older ones do:

```sh
gh api repos/aivara-se/<name>/rulesets --jq '.[] | {name,enforcement}'
```

An empty answer means no required review and no required check: the pull request reads `mergeStateStatus: CLEAN` without an approval. Do not merge it because the gate is absent; report the gap as the operator's, because applying an organisation ruleset needs `admin:org`, which the agent token does not carry.

## Write the product first

- Read `writing`'s `references/writing-product-doc.md` for the shape and a sibling's `PRODUCT.md` for the voice, never for its length.
- v1.0 carries one flow with one useful behaviour, not a feature list. The *does not do* and *unhandled* sections are the next versions' candidates.
- Acceptance is checkable by the operator: a count, a moment, a refused request, a surviving restart.
- If the operator asks for the version arc now, a short `Roadmap` may list candidates labelled **not commitments**; no ADR until one is picked (`references/design-decisions.md`, *Planning ahead across versions*).
- The first paragraph says who uses it and who runs it, not only who writes. "An Aivara project" names the maker, not the market: a public product is not an internal tool with a new skin, and the fleet's own service is not a template for it. The predecessor's tagline is not enough.
- Say plainly where the product cannot keep its promise alone — privacy depends on the deployment — and what makes it false.

## The first pull request

- Branch `docs/<slug>`; it carries `PRODUCT.md` at the repository root, where `aivara-se/.template` puts it (`dispatch`'s `docs/` layout is that repository's own), and a short `README.md` that points at it. Nothing runs yet, so no run section and no fake gate.
- Commit under the agent's identity; title `docs: ...`; body at most 150 words naming what is decided and what follows.
- Request the operator alone: a documents-only change is the operator's to review.
- Do **not** add `AGENTS.md`, `SYSTEMS.md` or ADRs before the product is settled: the entry file's house rules and check command depend on the stack, and `SYSTEMS.md` depends on the product. Name them in the body as the next artefacts. Once the product is settled in that pull request, add `SYSTEMS.md` and the first ADRs to the same branch and body: one review carries the set. A product that changes after the review has seen the PR is reissued from a clean branch, not amended in place.
- Report the link in the same turn.

## After the product is agreed

1. `SYSTEMS.md` — where it runs, how a write becomes a record, what is checked. Read `writing`'s `references/writing-system-doc.md` first; SYSTEMS is the shape, not the code: no config inventory, no DDL, no file-by-file functions.
2. `docs/adrs/NNN-…` — one decision per file, before the code it decides.
3. `AGENTS.md` from `aivara-se/.template`, with the real gate and every slot filled.
4. The first code, with its `validate` workflow.

A revival starts from the idea and the product document, not from the predecessor's code; its data is not imported unless the product says so.
