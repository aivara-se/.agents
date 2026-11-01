---
name: terminology-rename
description: Use when a term must be renamed across code, docs and repos.
version: 1.0.0
author: MiMi (thani-sh-mimi)
license: MIT
when-to-use: The operator renames a concept — a role, an entity, a codename, the organisation's own word for its components — and it has to hold in identifiers, tokens, file and directory names, copy, docs and the sibling repositories generated from the same template.
metadata:
  hermes:
    tags: [refactor, rename, terminology, multi-repo, verification]
    category: software-development
    related_skills: [change-planning, github, web-frontend-delivery, coding]
---

# Renaming a term across a repository (and its siblings)

## When to Use

- "Use X instead of Y, throughout the repo — and any other repos."
- A concept changes name because what it _is_ changed: a role that moved, an entity that split.
- A word used loosely in one repository has to match what the organisation publishes.

Not for a single local variable or a public API with its own migration story — that is a normal refactor with a type checker behind it.

## Procedure

1. **Survey, file type by file type, before touching anything.** Word-boundary counts per path (`grep -rIic '\bterm\b' src docs README.md`) and the hit list. Exclude generated and vendored trees (`node_modules`, `.svelte-kit`, `build`, lockfiles). **Include data files**: a `.json` content file holds user-visible copy, and a pass over only `.ts`/`.svelte`/`.md` leaves a stale word on the page.
2. **Free the target name before you claim it.** If a key, class, type or export already owns the new word, rename _that_ first and land it (a dictionary block `agent:` becomes `agentPage:` with its readers), then run the term pass. Otherwise the pass overwrites a live key or duplicates one, and both surface only as a type error after the damage.
3. **Move the files and directories with `git mv`** so history follows — then grep for the old _specifier_. Renaming a module is not renaming its importers: `lab.ts` → `agents.ts` left two dozen files importing `$lib/data/lab` and `./lab`, found by the type checker and nothing else.
4. **Replace with word boundaries, longest pattern first, and count every pattern.** Compound identifiers first (`BotCard`, `botGold`, `--bot-`), then `\bBots\b`, `\bbots\b`, `\bbot\b`, then the article case (`A bot` → `An agent`). Use `re.subn` and print the hit count per pattern. **Never a bare `str.replace`**: it is global and matches substrings — it took the first same-named key in the file, a nav label rather than the page label.
5. **Verify with the same boundaries, and subtract words that legitimately contain the letters.** `bottom`, `border-bottom` and `Roboto` are not hits, and flagging them buries the real ones. Report the false positives you excluded.
6. **Run the repository's own gates** in the order its docs give, plus its build — a term change breaks specifiers, duplicate keys and types.
7. **One pull request per repository, and the pull request is part of "everywhere".** Re-read the body and commit messages: a description still using the old word is the most visible inconsistency left behind.
8. **A repository _named_ after the term, and its URLs, are a separate decision.** Renaming one changes every address, the domain records and any CNAME claim. State the option with what it breaks and wait; never fold a repo rename into a text change.
9. **Report what the change deliberately did not reach.** Sibling repos generated from a template keep the old word. When the template repo is deleted upstream, the on-disk clone may be the last _pristine_ copy — keep it. Instruction files (`AGENTS.md` and friends) whose write needs operator approval are a finding to state, not a gap to paper over.

## Pitfalls

- **`str.replace` and a repo-wide formatter are the same class of mistake:** both act on text you did not scope. Scope replacements to patterns with boundaries, and pass explicit paths to formatters.
- **The new term usually carries a meaning change.** When a duty moves, the role document must say who owns it now; then sweep sibling docs for statements the new source of truth contradicts, and land the fix in the pull request that is still open.
- **Two sources describing the entity will disagree for one commit.** The page's rendering rule wins on the page and the source-of-truth file gets its own edit in its own repository; name both so neither reads as drift.
- **A rename is not a licence to re-copy.** Rewrite the term, not the sentences around it. The line a document uses as its own statement — motto, policy, principle — is never paraphrased: it is that entity's voice. Where one fact is written twice, the two may differ by design; do not "fix" it.
- **Do not restate the count from memory.** Re-run the survey after the pass.

## See also

- `change-planning` — when the rename spans repositories and needs an approved plan first.
- `web-frontend-delivery` — the gate and render checks to run after a rename that touches a built site.
