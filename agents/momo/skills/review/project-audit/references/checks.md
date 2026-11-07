# Checks

One section per check. Each says what it reads, what makes a finding, the false positive it has already produced, and what closes a true one.

## gate

- **Reads**: the fenced block under `## Verify before pushing` in `AGENTS.md`, at the pinned sha. Each line runs in my own worktree with a 180 s limit. `bun install --frozen-lockfile` runs first when `bun.lock` exists and `node_modules` is absent.
- **Fails**: a line exits non-zero for a reason of its own.
- **False positive**: a stack that needs a display or a shared library the sandbox lacks. Mark `not run` and quote the last line. A network failure is the same case.
- **Closes**: the repository fixes its tree. The audit never does.
- A repository with no block is `not run`, unless an exemption records the gap. The template's unfilled slot is not a gate.

## ci

- **Reads**: the last `validate` run on the default branch: conclusion, sha, url, and whether that sha is the audited one.
- **Fails**: `failure` at the audited head.
- **False positive**: a run at an older sha is history, not a red branch. Report `atHead: false` and do not call it a defect.
- Branch protection answers 404 to this token. `requiredCheck` is `unknown`, never a finding.

## claims

- **Reads**: relative links in markdown, `{{SLOT}}` leftovers, and `bun run <name>` references against the root `package.json` scripts.
- **Fails**: a link to a file outside the tree, a slot still unfilled, a script the repository does not declare.
- **False positives, both seen**: an example link written inside a code span, and `bun run scripts/x.ts` read as a package script. Strip code spans and fences first; end the captured name at a non-word character.
- **Also reads**: a named path the prose asserts, such as `scripts/check-docs.ts` running from a workflow. `git log --all --oneline -- <path>` at the pinned sha settles never-existed against deleted; absence is a finding, not a false positive. The full procedure for a document's claims is `claim-audit`.
- **Closes**: correct the document, or the script name.

## open

- **Reads**: open issues and pull requests with their age.
- **Fails**: nothing. Staleness is soft by contract: a pull request open three days or more, an issue with no assignee.
- **Why**: work that waits is the operator's to route. It is not a defect in the tree.

## exposure

- **Reads**: tracked files against a short secret pattern list, every workflow under `.github/workflows/`, and open Dependabot alerts.
- **Fails**: a pattern matches a live value.
- **False positive**: a documented example, a fixture, a test key. Read the file and line, then move it to `soft` with the reason.
- **Workflow hygiene**: no `permissions:` anywhere in the file (job level counts), and a `uses:` pinned to a branch instead of a version.
- **Closes**: rotate the credential first, then remove it from the tree. Never the other way round.

## Adding one

- Read the file and line before you call anything a defect.
- Prove the check on a planted case and on an innocent neighbour. A pattern that cannot match reports every repository as tidy.
- Record what the check cannot see, so the next reader does not read silence as a pass.
