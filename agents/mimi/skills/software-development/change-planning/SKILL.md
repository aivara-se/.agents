---
name: change-planning
description: "Use when asked to plan a change before it is built."
version: 1.0.0
author: MiMi (thani-sh-mimi)
license: MIT
metadata:
  hermes:
    tags: [planning, recon, migration, consolidation, multi-repo, operator-approval]
    related_skills: [github, codebase-inspection, spike, writing]
---

# Planning a change

## When to Use

- The operator asks for a plan instead of a change: "let me know when you have a plan", "how would you approach this".
- The work spans several repositories, or a template repo that generated them.
- The work touches URLs, hosting or a live deployment as well as source.
- A migration or consolidation is proposed and the shape of the result is not yet agreed.

## The job

The deliverable is an approval-ready plan; building starts only after the open decisions are answered.

## Recon before writing a word

1. **Inventory the repos.** `gh repo list <org> --limit 100` and `gh repo list <each-user> --limit 100`. Naming carries the structure: a template repo plus one repo per instance tells you the whole shape before you open a file.
2. **Clone what you will discuss** to `~/github/<owner>/<repo>` — org repos under the org owner, a member's repos under that member's user.
3. **Diff siblings generated from one template** instead of reading each in full: `diff <a>/index.html <b>/index.html`. The diff *is* the per-instance identity (accent, portrait, copy, canonical URL); everything it does not mention is template boilerplate that needs no migration decision. Grep the template for its own placeholder list (`{{TOKEN}}`) to get the complete set of per-instance facts in one pass.
4. **Read the docs of record before reusing shipped copy.** Copy in the code can be stale by design, and someone from outside the repo has to have flagged it — check the shared agent/role configuration, the design doc and the product doc first. Proposing to migrate stale text is the single most likely way to produce a wrong plan; say explicitly what will be rewritten and from where.
5. **Prove which assets are already shared** rather than copying them: `sha256sum` the candidates on both sides. Identical hashes retire an entire migration step.
6. **Read the target repo's own docs** (route table, `DESIGN`, `PRODUCT`, `AGENTS`) before proposing structure. "One source per fact", a single route table, and accent-token rules are usually already written down and override what you would have designed.
7. **Check the live deployment, not just the source.** Status of the current address *and* of the target path:
   ```bash
   for u in <url> <url>; do printf "%-34s " "$u"; \
     curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" -m 15 "$u"; done
   ```
   A 404 on the target path is the gap the plan closes; a 200 on the old address is what must keep answering during and after the move.
8. **Read the history of the repos you will touch:** `gh issue list -R <repo> --state all --limit 20`, `gh pr list -R <repo> --state all --limit 20`, and the last commits. A closed duplicate or a revert sitting at HEAD means the idea was already tried and rejected — the plan either says why this attempt differs or is not made.

## Shape of the plan

- Findings first, short and checkable, no preamble and no restatement of the request.
- Numbered decisions at the end, each option condensed to a single line, the recommended default **first** and marked as the recommendation. The operator decides in batches and answers as a numbered list.
- Ask only what genuinely changes the build (redirect mechanism, visual ground, where content lives, a dependency policy). Decide everything else yourself and say that you did.
- Mark which decisions need access an agent does not have (DNS zone, dashboard settings, archiving or deleting repos) and give the agent-only fallback for each one.
- One line for the honest cost: what stops working, which process retires, which check goes away. Do not bury it and do not soften it.
- Close with what you will do first and who reviews it, then stop. Do not start building while a decision is open.

## Pitfalls

- **A shared header/footer/nav block that a check enforces byte-for-byte is not five things to port — it is one component to import.** Look for the marker comments and the script that compares the copies (`<!-- HEADER:START -->`, `scripts/verify-site.ts`) before proposing per-page copies.
- **A page that looks empty is still a page.** An empty log or registry contributes its structure and voice rules; port the page, not the content.
- **The same asset in two places is normal, not a duplicate to resolve.** Hash it; if the bytes match, one copy survives and the other is deleted, not reconciled.
- **Never retire an address silently: name either the redirect or the accepted loss.** For each old URL the plan states whether it gets a redirect (and which access that needs) or is deliberately left answering as-is. An operator who says nobody visits them yet may accept stale content on the old addresses — that is a decision to record, not an omission, and the plan says plainly what becomes of the repositories that served them: left untouched, they keep serving text that is now wrong, and nothing points from them to the new home. See `references/origin-consolidation.md`.
- **Do not read a stale README as the current shape.** Repos that were renamed, split or moved usually carry a map that lies; the git log and the live URLs are the tiebreakers.
- **Propose the original's page boundaries, not a tidier set.** Folding two pages into one (a front page and its log, an index and its detail) looks like a simplification in a plan and is reversed as soon as the operator sees it, because a visitor compares whole pages. Plan the original's boundaries, and put the chrome those pages share in a per-instance layout, so the seam can move later without re-cutting every page.

## References

- `references/origin-consolidation.md` — folding several subdomains into paths on one origin: redirect options, what each needs, and the checks that make the move verifiable.
