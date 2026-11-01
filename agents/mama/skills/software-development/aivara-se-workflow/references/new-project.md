# Starting a new project

A new `aivara-se` repository starts with its product document: product, then shape, then the first version. Each lands by pull request; a documents-only one asks the operator alone.

## Create it

```sh
gh repo create aivara-se/<name> --public \
  --description "<one line: what it is for>" --add-readme
```

`--add-readme` gives `main` a first commit; a pull request needs a base, and an empty repository cannot take one. Create only when the operator asked — it is a public act in the organisation.

You administer the new repository, so align it with the baseline (`.github/docs/SETTINGS.md`):

```sh
gh repo edit aivara-se/<name> \
  --enable-wiki=false --enable-projects=false \
  --enable-squash-merge=false --enable-merge-commit=false \
  --delete-branch-on-merge=true
```

Read back with `gh repo view aivara-se/<name> --json rebaseMergeAllowed,squashMergeAllowed,mergeCommitAllowed,deleteBranchOnMerge`; the REST `allow_*` names belong to `gh api`, not that flag.

**Check the ruleset; do not assume it.** A new repository can carry no `Baseline` ruleset while older ones do:

```sh
gh api repos/aivara-se/<name>/rulesets --jq '.[] | {name,enforcement}'
```

Empty means no required review and no required check: the pull request reads `mergeStateStatus: CLEAN` without an approval. Do not merge because the gate is absent; report it as the operator's — an organisation ruleset needs `admin:org`, which the agent token lacks.

## Write the product first

- Shape from `writing`'s `references/writing-product-doc.md`; voice from a sibling `PRODUCT.md`, never its length.
- v1.0 is one flow with one useful behaviour, not a feature list; _does not do_ and _unhandled_ are next-version candidates.
- Acceptance must be checkable: a count, a moment, a refused request, a surviving restart.
- On request, a short `Roadmap` may list candidates labelled **not commitments**; no ADR until one is picked (`references/design-decisions.md`, _Planning ahead across versions_).
- The first paragraph names who uses it and who runs it, not only who writes. "An Aivara project" names the maker, not the market: a public product is not an internal tool with a new skin, and a predecessor's tagline is not enough.
- Say where the product cannot keep its promise alone — privacy depends on the deployment — and what makes it false.

## The first pull request

- Branch `docs/<slug>`, carrying `PRODUCT.md` at the root, where `aivara-se/.template` puts it (`dispatch`'s `docs/` layout is that repository's own), and a short `README.md` pointing at it. Nothing runs yet: no run section, no fake gate.
- Commit under the agent's identity; title `docs: ...`; body at most 150 words: what is decided, what follows.
- Request the operator alone; a documents-only change is theirs to review.
- Do **not** add `AGENTS.md`, `SYSTEMS.md` or ADRs before the product is settled: house rules and the check command depend on the stack, `SYSTEMS.md` on the product. Name them in the body as the next artefacts. Once settled, add `SYSTEMS.md` and the first ADRs to the same branch and body. A product changed after review reissues from a clean branch, never an in-place amend.
- Report the link in the same turn.

## After the product is agreed

1. `SYSTEMS.md` — where it runs, how a write becomes a record, what is checked. Read `writing`'s `references/writing-system-doc.md` first; SYSTEMS is shape, not code: no config inventory, no DDL, no file-by-file functions.
2. `docs/adrs/NNN-…` — one decision per file, before the code it decides.
3. `AGENTS.md` from `aivara-se/.template`, with the real gate and every slot filled.
4. The first code, with its `validate` workflow.

A revival starts from the idea and the product document, not the predecessor's code; its data is not imported unless the product says so.
