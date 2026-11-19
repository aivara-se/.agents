# Reviewing a documents-only change

A plan, a spec or a design changes documents, not code. One gate still runs, but it reads two files; the conflicts live in the rest.

## The pass

1. Pin the head, and re-read `origin/<branch>` before the verdict: a bare branch is force-pushed with no notice. `git worktree add --detach ~/scratch/<agent>/<task> <sha>`. When the branch has no pull request, the tree at the head is the item and `origin/main...<branch>` is the diff. A merge base means a normal change. No merge base means the branch replaces the default: read the tree.
2. Write the contract from the documents the branch claims to satisfy: the product, the system, the standard, and the ADRs it deletes or replaces. Hold the plan to what it says it will build, not to code you would write.
3. Read each document whole. Map every fact to its owner in the home table: `PRODUCT` is what a person sees, `SYSTEMS` the mechanism and dependency, `DESIGN` the fixed values. An ADR holds the decision and its cost, `README` how to run it, `AGENTS` what holds in every repository. A fact in two documents is a finding even when they agree: the next edit moves one and not the other.
4. Grep each side of a claim, not the diff. `git grep -n '<the claim>'` across the tree; one rule can live in five files, and the `Never` register is the one a reader obeys. Collect every line before you decide which side is wrong.
5. Run every gate the organisation owns, with explicit paths:
   - `bun run scripts/validate-docs.ts <tree> --require` checks headings, caps and a 12-word repeat, and reads `PRODUCT.md` and `SYSTEMS.md` only.
   - `bun run scripts/validate-agents.ts --canon docs/ENTRY.md --entry <tree>/AGENTS.md` requires the entry file byte for byte. Bare, it validates the org repository, not the target.
6. Read the baseline documents the branch does not carry: `SETTINGS.md` for merge queue, required check and merge method. `RELEASES.md` holds the release file and workflow, `DOCUMENTS.md` the home table. A workflow that drops `merge_group`, renames the required job or deletes a gate contradicts the baseline, even when no file in the branch mentions it.
7. Check the decision record. A merged ADR is superseded, never deleted, and its number is never reused. Dropping the rule from the entry file does not repeal the standard. Every decision still relied on — dedup, licence, cap, configuration — needs a record at the head.
8. Send a design document to `references/reviewing-a-mock.md` and hold the mock to it. Tokens are normative: every `font`, `padding` and hex value in the mock must exist in the token set. Measure each text colour against its surface with `scripts/contrast.py`.
9. Report in the review's shape: verdict first, one finding per conflict with `file:line` on both sides. Name the side that changes as the author's decision. Close with one line naming the gate command and the head.

## Pitfalls

- A green documents gate is not a documents review: `DESIGN.md`, `README.md`, `AGENTS.md`, the ADRs and the mock are outside it.
- A repository can carry a new universal file before `.github` changes. Two entry files then exist, and the branch may delete the job that compares them. The standard lands first, then the copies.
- A conflict with a document in another repository is an issue there. The branch cannot fix it and is not failed for it; report the line.
- The mock's sample data is a document. The prompt states one postcondition and the record stores another, an output reads "1 commits", or a satisfied postcondition sits on a pending flow. The product's rules apply to it.
- A permission inside `Never` is a Scope conflict: `Never` is refused in every version, while `In` is this version's work. A limit belongs in `In` or `Behaviour`.
- A count comes from `git diff --name-status | grep -c '^D'` or an explicit list, never the diffstat or a directory listing. One hidden file turns a finding into a retraction.
- A contradiction inside one bullet is the strongest finding: "the agent performs every write" and "the engine writes only the labels" cannot both hold.
- Report the conflict, not the rewrite. Naming which side wins is the author's decision; naming the two lines is yours.
