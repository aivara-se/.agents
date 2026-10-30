---
name: terminology-rename
description: Use when a term must be renamed across code, docs and repos.
version: 1.0.0
author: MiMi (thani-sh-mimi)
license: MIT
when-to-use: The operator renames a concept — a role, an entity, a codename, the organisation's own word for what its components are — and it has to hold in identifiers, tokens, file and directory names, copy, docs and the sibling repositories that were generated from the same template.
metadata:
  hermes:
    tags: [refactor, rename, terminology, multi-repo, verification]
    category: software-development
    related_skills: [change-planning, github, web-frontend-delivery, coding]
---

# Renaming a term across a repository (and its siblings)

## When to Use

- "Use X instead of Y, throughout the repo — and any other repos."
- A concept changes name because what it *is* changed: a role that moved, an entity that split, an
  organisation adopting its own word for its parts.
- A word used loosely in one repository has to match the word the rest of the organisation publishes.

Not for renaming a single local variable or a public API with its own migration story — that is a normal
refactor with a type checker behind it.

## Procedure

1. **Survey, file type by file type, before touching anything.** Word-boundary counts per path
   (`grep -rIic '\bterm\b' src docs README.md`) and the hit list. Exclude generated and vendored trees
   (`node_modules`, `.svelte-kit`, `build`, lockfiles) — an unrestricted case-insensitive count over a
   repository is mostly dependencies and tells you nothing. **Include data files**: a `.json` content file
   holds user-visible copy, and a pass that only walks `.ts`/`.svelte`/`.md` leaves a stale word on the page.
2. **Free the target name before you claim it.** If an existing key, class, type or export already owns
   the new word, rename *that* first and land it (a dictionary block `agent:` becomes `agentPage:` along
   with every reader of it), then run the term pass. Otherwise the pass collides with the current owner:
   the second pass either overwrites a live key or produces a duplicate, and both failures surface only as
   a type error after the damage. Read the dictionary/type structure and decide this **before** step 3.
3. **Move the files and directories the term names with `git mv`** so history follows the rename — then
   grep for the old *specifier*. Renaming a module is not renaming its importers: `lab.ts` → `agents.ts`
   left two dozen files importing `$lib/data/lab` and `./lab`, found by the type checker and nothing else.
4. **Replace with word boundaries, longest pattern first, and count every pattern.** Compound identifiers
   and their prefixed forms first (`BotCard`, `botGold`, `--bot-`), then `\bBots\b`, `\bbots\b`, `\bbot\b`,
   then the article case (`A bot` → `An agent`, `a bot` → `an agent`). Use `re.subn` and print the hit count
   per pattern, so the pass is reportable and re-runnable. **Never a bare `str.replace`**: it is global — it
   takes the *first* same-named key anywhere in the file, which was a nav label rather than the page label
   the change was about — and it matches substrings.
5. **Verify with the same boundaries, and subtract the words that legitimately contain the letters.**
   `bottom`, `border-bottom` and `Roboto` in a font stack are not hits, and a check that flags them buries
   the real ones. The finish line is zero real hits; report the false positives you excluded so the next
   reader can run the same check and get the same answer.
6. **Run the repository's own gates**, in the order its docs give, plus its build — a term change breaks
   specifiers, duplicate keys and types, and only the gates see all three.
7. **One pull request per repository, and the pull request is part of "everywhere".** Re-read the body and
   the commit messages you wrote before the rename: a PR description still using the old word is the most
   visible inconsistency the change leaves behind.
8. **A repository *named* after the term, and its URLs, are a separate decision.** Renaming one changes
   every address that points at it, the domain records and any CNAME claim. State the option with what it
   breaks and wait for the operator; never fold a repository rename into a text change.
9. **Report what the change deliberately did not reach.** Sibling repositories generated from a template
   carry their own copy of the docs and keep the old word; a stale repo stays stale. When the template
   repository itself is deleted upstream, the clone on disk may be the last *pristine* copy — the generated
   siblings hold filled-in copies, not the placeholders — so keep it and say so rather than tidying it away. Instruction files
   (`AGENTS.md` and friends) whose write needs operator approval are a finding to state, not a gap to paper
   over with a shell or a formatter.

## Pitfalls

- **Python's `str.replace` and a repo-wide formatter are the same class of mistake:** both act on text you
  did not scope. Scope replacements to patterns with boundaries, and pass explicit paths to formatters.
- **The new term usually carries a meaning change, and the files that describe ownership need rewriting**,
  not just retitling: when a duty moves to someone else, the sentence in the role document that says what
  the role owns has to say who owns it now. Then sweep the sibling repositories' docs for statements the new
  source of truth contradicts — a doc still handing that role a duty it no longer has — and land the fix in
  the pull request that is still open rather than waiting to be asked or opening a second one.
- **Two sources that both describe the entity will disagree for one commit.** The page's rendering rule
  wins on the page and the source-of-truth file gets its own edit in its own repository; name both in the
  report so neither is mistaken for drift.
- **A rename is not a licence to re-copy.** Rewrite the term, not the sentences around it — the operator's
  wording is deliberate and a "while I was in there" paraphrase costs a review round. The line a document
  uses as its own statement — the motto, the policy, the principle the entity lives by — is never
  paraphrased: it is that entity's voice, and its replacement reads as damage to the thing rather than as
  part of the rename. Where one fact is written in two places, the two are allowed to differ by design (the
  source file states the policy, the page carries the introduction), so do not "fix" the difference.
- **Do not restate the count from memory.** Re-run the survey after the pass; a stale "N occurrences" in the
  PR body is worse than no number.

## See also

- `change-planning` — when the rename spans repositories and needs an approved plan first.
- `web-frontend-delivery` — the gate and render checks to run after a rename that touches a built site.
