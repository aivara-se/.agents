# Auditing the shared skill corpus

Use for "do these skills conflict", "any stale bits", "can we trim this" about `aivara-se/.agents`. Read-only unless the operator asks for edits.

## Read the right copy

Clone the remote into a throwaway directory (`/tmp/...`), never the shared `~/github/aivara-se/.agents` checkout: that tree is behind by definition and another session may hold a branch in it. Read `git log --oneline -12` first — a previous trim may already have landed.

Read every `SKILL.md` with its `references/`, `templates/` and the `agents/*.md` roster: findings sit between files, so sampling misses them.

## Mechanical passes

Run these in `execute_code` and print only the summary; each is a table of file:line.

- **Contradictions.** Grep one noun at a time across all skills — `script`, `comment`, `wrap`, `review`, `merge`, `test`, `pull request` — and read every hit. Two rules for the same act is the finding; which wins is the decision.
- **Leakage.** List each org repository's toolchain (`go.mod`, `package.json`, `scripts/*.ts`) and check every "always/never" rule naming a language, runtime, tool or layout against it. A rule true of the majority is still wrong if one repo cannot follow it.
- **Stale enumerations.** Compare every written list (`skills/` names in `agents/*.md`, layout blocks, check commands) against the disk. Worst kind: a list the repository's own `AGENTS.md` forbids — it calls the tree the index, then keeps a copy.
- **Duplication.** Count identical lines across `agents/*.md`; diff `README.md` against the root `AGENTS.md` section by section. Self-contained SOUL files make some duplication deliberate — say what it costs, not that all of it is waste.
- **Adjectives.** One word list (`very`, `really`, `simply`, `just`, `robust`, `seamless`, `genuinely`, `a handful`). Most hits sit inside `writing`'s ban list — report only genuine ones, and say "not the problem" when it is.

## Classify before reporting

Each bucket takes a different fix. **Contradiction** — same act, two rules: name both lines and which should survive. **Leakage** — a rule true of one repository stated for all: move it there or make it conditional on the toolchain. **Stale fact** — a list, host, path or builder the tree contradicts. **Duplication** — one fact, two homes, including the README against `AGENTS.md`.

## Report

Hardest first, `file:line`, both halves of the conflict quoted. Then what is already right. Split the actions: decisions (behaviour changes) against mechanical work (wording, stale lists, duplicates).

## Landing the cleanup PR

On "create a PR", only the mechanical bucket lands. Contradictions that change what an agent does stay out and are named in the body as decisions, each with both sides.

- **The reviewer is the operator alone.** A corpus cleanup is documents-only, so `thani-sh` and no peer: `gh pr edit <n> --add-reviewer thani-sh`, then read `gh pr view <n> --json reviewRequests` back. Do not ask first, and do not add a peer because `AGENTS.md` says "one peer" — that clause is for implementation.
- **Add the check for the rule you enforced.** A rule only prose enforces drifts back: front-matter shape, `name` equal to the directory, the slot grep. Put them in `validate.yml`, run the extracted shell before pushing, and confirm it green on the pull request.

## Pitfalls

- **Anchoring on `- name:` swallows the step.** Replacing an existing step's first line to add a job step deletes that step without a conflict. Anchor on the following line or append, then re-read the file and confirm the old step still runs.
- **Keep the PR body off a generic `/tmp` path.** The sandbox `/tmp` is shared, and `write_file` refuses a name another session created; write it in your workspace under a fresh name.
- **A corpus drifts by addition.** Every incident adds a clause, so the newest text is the most project-specific. Read recent commits and the longest bullets first.
- **A rule that names a virtue does not bind.** "Keep it small" and "stay in scope" can sit in two skills while the loop still grows, because no actor runs them at decision time. Report the missing per-item gate: quote the task line it serves, post the full list once, verify in a second round; a third is the operator's.
- **Forbidding a skill to point at another guarantees duplication.** Cross-cutting rules (the request-changes gate, review routing) get copied into two skills and diverge. Report where the rule should live, not a wording fix.
- **An `agents/<bot>.md` finding is a live SOUL.** Repository text reaches a running agent only when its `SOUL.md` is copied again. A cleanup PR may land a duplicated fact (skills list, stale path), never a change to a role, boundary or voice — that is the agent's own pull request, and the copy timing is the operator's.
- **Do not open the cleanup PR on the audit turn.** "Check and list" is read-only; end by offering the mechanical PR and the open decisions.
