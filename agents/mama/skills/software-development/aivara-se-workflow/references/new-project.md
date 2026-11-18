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
- Do **not** add `SYSTEMS.md` or ADRs before the product is settled: the check and the architecture depend on the stack. `AGENTS.md` is the same file from the first commit: copy it, never write it. Name them in the body as the next artefacts. Once settled, add `SYSTEMS.md` and the first ADRs to the same branch and body. A product changed after review reissues from a clean branch, never an in-place amend.
- Report the link in the same turn.

## After the product is agreed

1. `SYSTEMS.md` — where it runs, how a write becomes a record, what is checked. Read `writing`'s `references/writing-system-doc.md` first; SYSTEMS is shape, not code: no config inventory, no DDL, no file-by-file functions.
2. `docs/adrs/NNN-…` — one decision per file, before the code it decides.
3. `AGENTS.md` copied unchanged from `aivara-se/.github/docs/ENTRY.md`, and the `agents` job that proves it.
4. The first code, with its `validate` workflow.

A revival starts from the idea and the product document, not the predecessor's code; its data is not imported unless the product says so.

## A rewrite in the same repository

A version that replaces the tree starts on an orphan branch: the old history is not an ancestor, and no pull request can open until the branch has its own base.

```sh
git worktree add --orphan -b next ~/github/worktrees/<repo>-next
```

Git 2.42 or later. Never cut it in the shared clone's working tree — that checkout belongs to whichever session last ran `git`. Read the root commit's parents (`git log --format=%P -1 <branch>`), not the branch's commit count: the field must be empty.

Bootstrap from `aivara-se/.template`, not from memory: the entry file with its six slots filled, `README.md`, `PRODUCT.md`, `SYSTEMS.md`, `docs/adrs/`, `LICENSE`, `.gitignore`, and `.github/workflows/validate.yml`. Filling the purpose and gate slots is the adoption; it is not a fork of the entry file.

- **An inherited `.gitignore` and comment name the predecessor.** The basics copied from the old tree carry its artefacts — a config filename, an audit log, an `as v1 does` comment. After the bootstrap, grep the branch for the old version, its file names and its phrases (`v1`, `1.16`, `audit.jsonl`, `as v1`) and remove each; the document checker reads prose only, so nothing else catches them.
- **The gate in the entry file must pass on the tree as it stands.** An empty Go module fails: `go vet ./...` exits 1 with "matched no packages". A documents-only bootstrap points the required `validate` job at the document checker and names the Go gate as the first code's work.
- **When the documents are the only gate, name the reused job `validate`.** A job `validate` whose `uses:` is `aivara-se/.github/.github/workflows/validate-docs.yml@main` makes the required check real; when code arrives, add the Go job and rename the document one `docs`.
- **Settle what the branch is before numbering its first ADR.** A rewrite that merges back into the default branch keeps the repository's records: take `max+1` from `git ls-tree --name-only origin/main docs/adrs/`, or two `001`s collide in one directory. A reboot that abandons the old decisions is its own history: start at `001`, cite nothing, and keep the predecessor out of the Context — its records are bloat, not precedent. Ask which it is before the first push; a renumber after it leaves commits that a linear history cannot erase without a force-push.
- **Iterate on the checker's numbers.** From a checkout of `aivara-se/.github`, `bun run scripts/validate-docs.ts <repo> --require` prints one line per failing section with its count and cap. For exact per-section counts, import its exports (`splitSections`, `countWords`) in a `bun -e` script rather than estimating.
- **A bootstrap branch carries one commit.** Fold each correction into the root: `git reset --soft $(git rev-list --max-parents=0 <branch>)`, `git commit --amend`, then `git push --force-with-lease origin <branch>`. Read it back with `gh api repos/<owner>/<repo>/commits/<branch> --jq '.parents | length'`; it must print `0`. The operator reads the branch as one artefact, and a renumber or a grep fix as its own commit is noise. Force-push only a branch this session made, on the operator's instruction, and with the lease.
- **Push and read the run; open no pull request.** `gh run list -R <owner>/<repo> --branch next` reports in seconds, and an orphan branch has no base to open against.
- **Report the branch's shape and its numbering in the same message.** Say "orphan, root commit `<sha>`, no parent" or the commit it was cut from, and where the ADRs start. The operator reads the branch before its files; a report that says only "pushed" invites the two questions — did it fork `main`, and why does the first record carry a late number.
