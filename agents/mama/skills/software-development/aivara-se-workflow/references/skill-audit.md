# Auditing the shared skill corpus

For a request to clean up, check or untangle `aivara-se/.agents` — "do these skills conflict", "any stale bits", "can we trim this". It is a read-only pass unless the operator asks for the edits.

## Read the right copy

Clone the remote into a throwaway directory (`/tmp/...`), not the shared `~/github/aivara-se/.agents` checkout: that working tree is behind by definition and another session may have a branch checked out in it. Read `git log --oneline -12` before forming a view — a previous trim may already have landed, and proposing it again wastes the turn.

Read every `SKILL.md` with its `references/`, `templates/` and the `agents/*.md` roster. The corpus is small (hundreds of lines, not thousands) and the findings are between files, so sampling misses them.

## Mechanical passes

Run these in `execute_code` and print only the summary; each is a table of file:line, not an essay.

- **Contradictions.** Grep one noun at a time across all skills — `script`, `comment`, `wrap`, `review`, `merge`, `test`, `pull request` — and read every hit. Two rules for the same act is the finding; which one wins is the decision.
- **Leakage.** List each org repository's toolchain first (`go.mod`, `package.json`, `scripts/*.ts`) and check every "always/never" rule naming a language, runtime, tool or file layout against that list. A rule true of the majority is still wrong if one repo cannot follow it.
- **Stale enumerations.** Compare every written list (`skills/` names in `agents/*.md`, layout blocks, check commands) against the disk. A list the repository's own `AGENTS.md` forbids is the worst kind: it says the tree is the index, then keeps a copy.
- **Duplication.** Count identical lines across `agents/*.md`; diff `README.md` against the root `AGENTS.md` section by section. Self-contained SOUL files make some duplication deliberate — say what it costs (the roster list already drifted) instead of calling all of it waste.
- **Adjectives.** One word list (`very`, `really`, `simply`, `just`, `robust`, `seamless`, `genuinely`, `a handful`). Expect most hits inside the ban list in `writing` — report only genuine ones, and say "not the problem" when it is.

## Classify before reporting

Four buckets, because the fix differs:

- **Contradiction** — same act, two rules. Name the two lines and which should survive.
- **Leakage** — a rule true of one repository stated for all of them. Move it to that repository's documents or make it conditional on the toolchain.
- **Stale fact** — a list, host, path or builder the tree contradicts.
- **Duplication** — one fact, two homes, including the repository's own README against its `AGENTS.md`.

## Report shape

Hardest first, one or two lines each, with `file:line` and both halves of the conflict quoted. Then what is already right, so the report does not read as an order to rewrite everything. Split the actions: what needs a decision (behaviour changes) against what is mechanical (wording, stale lists, duplicates).

## Landing the cleanup PR

When the operator answers the report with "create a PR", only the mechanical bucket lands. The contradictions that change what an agent does stay out and are named in the body as decisions — each with both sides, so the reviewer sees what is still unsettled rather than discovering it in review.

- **The reviewer is the operator alone.** A cleanup of the corpus is documents-only, so `thani-sh` and no peer: apply it with `gh pr edit <n> --add-reviewer thani-sh` and read `gh pr view <n> --json reviewRequests` back. Do not ask first, and do not add a peer because `AGENTS.md` says "one peer" — that clause is for implementation.
- **Add the check for the rule you just enforced.** A corpus rule that only prose enforces drifts back; the front-matter shape, `name` equal to the directory, and the slot grep belong in `validate.yml`. Run the new check on the tree before pushing (extract the shell and `bash` it) and confirm it green on the pull request.
- **A `agents/<bot>.md` edit is a live profile.** The repository text reaches a running agent only when its `SOUL.md` is copied again, so say in the body that the roster changes text and the copy is the operator's to time. Removing a duplicated fact from it is still a corpus edit, not a new identity.

## Pitfalls

- **Anchoring a workflow edit on `- name:` swallows the step.** Adding a job step by replacing the existing step's first line deletes that step without a conflict; anchor on the following line or append at the end, then re-read the file and confirm the old step still runs. The loss is silent until the check that mattered stops firing.
- **Keep the PR body off a generic `/tmp` path.** The sandbox's `/tmp` is shared between sessions, and `write_file` refuses a name another session already created; write it inside your workspace under a fresh name.
- **A skill corpus drifts by addition.** Every incident adds a clause, so the newest text is the most project-specific. Read the recent commits and the longest bullets first.
- **A rule that names a virtue does not bind; report the per-item test it is missing.** "Keep it small" and "stay in scope" can sit in two skills while the loop still grows, because no actor runs them at the moment of decision. The rule that binds is a check on each item — quote the task line the finding serves, post the complete list once, verify in the second round and make a third the operator's. An audit that finds an adjective reports the missing gate, not a synonym.
- **The README rule that forbids a skill pointing at another skill guarantees duplication.** Cross-cutting rules (the request-changes gate, the review routing) get copied into two skills and diverge. Report it as a decision about where the rule lives, not as a wording fix.
- **The corpus's own rules apply to the corpus.** Check the repository's files against its own `writing` skill (hard-wrap, length, one home per fact) before judging the skills' prose.
- **An `agents/<bot>.md` finding is a live SOUL.** An audit proposes it; a cleanup PR may land a duplicated fact (a skills list, a stale path) but never a change to a role, a boundary or a voice — that is the agent's identity and its own pull request.
- **Do not open the cleanup PR on the audit turn.** "Check and list" is read-only; end by offering the mechanical PR and the open decisions.