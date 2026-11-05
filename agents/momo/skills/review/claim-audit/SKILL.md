---
name: claim-audit
description: "Use when a doc makes claims: verify each against the tree."
version: 1.0.0
author: MoMo
license: MIT
when-to-use: The operator asks whether a document's statements are true, or a standard, README, ADR or PR body claims what the tree, the organisation or the history does.
metadata:
  hermes:
    tags: [audit, claims, docs, github]
    related_skills: [review, project-audit, writing]
---

# Claim audit

A document records intent, not fact. Hold every sentence that names a path, a number, a mechanism or a practice to what the repository and the organisation show at a pinned commit. Report; never fix.

## When to Use

The operator names a document and asks whether it is true. Load it for any README, standard, ADR, template or PR body whose sentences can be tested against a tree. Not for a pull request's diff, which is `review`'s, and not for the daily repository audit, which is `project-audit`'s.

## Pin first

A claim about `main` is a claim about one sha. Your clone is often days old, and the file may not even exist in it.

```bash
git -C ~/github/aivara-se/<repo> fetch --all --prune
git -C ~/github/aivara-se/<repo> log --oneline -1 origin/main
git -C ~/github/aivara-se/<repo> worktree add --detach \
  ~/scratch/momo/<task> $(git -C ~/github/aivara-se/<repo> rev-parse origin/main)
```

Read every file from the worktree, and quote the sha in the report. A stale clone answers "no such file" and `git log -- <path>` answers "never existed" for the same reason; neither is evidence until the fetch is done.

## List the claims before you test them

One pass to extract, a second to check. Each kind has its own proof:

- **Existence** — a named path, script or workflow. `git log --all --oneline -- <path>` at the pinned sha separates never-existed from deleted; `gh api repos/<o>/<r>/contents/<path>` confirms the tree. A doc that says `scripts/x.ts` runs from `.github/workflows/y.yml` claims two files: check both.
- **Mechanism** — "a repository calls it as one job in `validate`". Read the caller (the calling workflow's `uses:`) and the callee's trigger (`on: workflow_call`). A name in prose is not a call.
- **Arithmetic** — stated totals, caps or counts. Sum them in `python3 -c`, never in your head. A total that equals the sum of caps leaves the author no slack; say so.
- **Adoption** — "each repository does X", "the shape is fixed". Enumerate with `gh repo list <org>`, then read the artifact per repo with `gh api repos/<o>/<r>/contents/<path>`. Count what complies, and name the word counts against the cap.
- **Contradiction** — the same fact stated elsewhere: `README.md`, the entry `AGENTS.md`, `aivara-se/.agents/skills`. A skill that still prescribes the old shape makes every agent violate the new rule; that is a finding, and it is not the diff's.

## Prove absence by enumeration

`gh search code` can return empty without an error, and its silence proves nothing. Absence is proved repo by repo, path by path, or not at all. Check open PRs (`gh pr list --state open`) before you call a missing file a defect: work in flight changes the report, not the fact.

## What is not a defect

- An argument or a rationale. "Free text hides the rule" is a claim of judgement, not of fact.
- A standard younger than its rollout. Say "false today, with no effective date" and name the two repos that carry the artifact. Do not call the rule wrong because nobody follows it yet.
- A rule with no unit. "Twelve words repeated" and a cap that never says whether headings or tables count are unimplementable, not false: report the missing definition, so whoever writes the checker cannot pick one silently.
- A policy with no enforcement behind it is a rule, not a falsehood; say which file would enforce it.

## Report

Answer first, then three groups, each line carrying the sha or the command that proves it:

1. **Holds** — the claims you verified, so silence is never read as a pass.
2. **False** — claim, what the tree shows, and the smallest correct sentence.
3. **Unimplementable** — the missing definition.

A false claim about merged work earns an issue on the repository that owns the file, not a review. Offer it; the operator routes it.
