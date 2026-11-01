---
name: change-planning
description: "Use when asked to plan a change before it is built."
version: 1.0.0
author: MiMi (thani-sh-mimi)
license: MIT
metadata:
  hermes:
    tags:
      [planning, recon, migration, consolidation, multi-repo, operator-approval]
    related_skills: [github, codebase-inspection, spike, writing]
---

# Planning a change

## When to Use

- The operator asks for a plan instead of a change: "let me know when you have a plan", "how would you approach this".
- The work spans several repositories, or a template repo that generated them.
- The work touches URLs, hosting or a live deployment as well as source.
- A migration or consolidation is proposed and the shape of the result is not agreed.

The deliverable is an approval-ready plan; build only after the open decisions are answered.

## Recon before writing a word

1. **Inventory and clone.** `gh repo list <org> --limit 100`, plus each user's. Clone to `~/github/<owner>/<repo>`. Naming carries the structure: a template repo plus one repo per instance tells you the shape before you open a file.
2. **Diff siblings from one template** instead of reading each in full: `diff <a>/index.html <b>/index.html`. The diff _is_ the per-instance identity (accent, portrait, copy, canonical URL); what it omits is boilerplate needing no decision. Grep the template for `{{TOKEN}}` to get every per-instance fact in one pass.
3. **Read the docs of record before reusing shipped copy** — shared agent/role configuration, design doc, product doc. Copy in code can be stale by design, and migrating stale text is the likeliest way to a wrong plan. Say what will be rewritten and from where.
4. **Hash shared assets:** `sha256sum` both sides. Identical hashes retire a migration step.
5. **Read the target's own docs** (route table, `DESIGN`, `PRODUCT`, `AGENTS`) before proposing structure. "One source per fact", a single route table and accent-token rules usually already exist and override your design.
6. **Check the live deployment, not just the source:**
   ```bash
   for u in <url> <url>; do printf "%-34s " "$u"; \
     curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" -m 15 "$u"; done
   ```
   A 404 on the target path is the gap the plan closes; a 200 on the old address is what must keep answering during and after the move.
7. **Read the history you will touch:** `gh issue list -R <repo> --state all --limit 20`, `gh pr list -R <repo> --state all --limit 20`, and the last commits. A closed duplicate or a revert at HEAD means the idea was tried and rejected — say why this attempt differs, or do not plan it.

## Shape of the plan

- Findings first, short and checkable, no preamble and no restatement of the request.
- Numbered decisions last, one line per option, the recommended default **first** and marked; the operator answers as a numbered list.
- Ask only what changes the build (redirect mechanism, visual ground, where content lives, a dependency policy). Decide the rest and say you did.
- Mark decisions that need access an agent lacks (DNS zone, dashboards, archiving or deleting repos) and give the agent-only fallback for each.
- One line for the honest cost: what stops working, which process retires, which check goes away.
- Close with what you will do first and who reviews it, then stop.

## Pitfalls

- **A shared header/footer/nav block that a check enforces byte-for-byte is one component to import, not five pages to port.** Find the marker comments and the comparing script (`<!-- HEADER:START -->`, `scripts/verify-site.ts`).
- **A page that looks empty is still a page.** An empty log or registry carries structure and voice rules; port the page, not the content.
- **The same asset in two places is normal, not a duplicate to resolve.** Hash it; equal bytes mean one copy survives, not a reconciliation.
- **Never retire an address silently.** For each old URL state the redirect (and the access it needs) or the accepted loss. Say plainly what becomes of the repositories that served it: untouched, they keep serving text that is now wrong, and nothing points to the new home. See `references/origin-consolidation.md`.
- **Do not read a stale README as the current shape.** Renamed, split or moved repos carry a map that lies; the git log and live URLs are the tiebreakers.
- **Propose the original's page boundaries, not a tidier set.** Folding two pages into one is reversed when the operator sees it, because a visitor compares whole pages. Put shared chrome in a per-instance layout so the seam can move later.

## References

- `references/origin-consolidation.md` — folding several subdomains into paths on one origin: redirect options, what each needs, and the checks that make the move verifiable.
