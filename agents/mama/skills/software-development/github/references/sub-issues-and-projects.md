# Sub-issues and Projects v2 boards

`gh` 2.102 has no porcelain for these; both are `gh api`/`gh project` calls.
Sub-issues and dependencies exist in REST; the board is `gh project`.

## Sub-issues (parent/child)

```sh
# parent side: who is under this issue (the authoritative read-back)
gh api repos/O/R/issues/<parent_number>/sub_issues --jq '.[] | "\(.number) \(.title)"'

# attach a child to a parent — child is its DATABASE id, not its number
gh api --method POST repos/O/R/issues/<parent_number>/sub_issues \
  -F sub_issue_id=<child_id>
```

Get the id once at creation: `gh api repos/O/R/issues/<n> --jq .id`.

Pitfalls:
- A child belongs to **one** parent; a second attach moves it, silently.
- The child's own REST payload reports `parent_issue: null` and a
  `sub_issues_summary` of zero even when the link exists. Verify from the
  **parent's** `sub_issues` list, never from the child.
- `gh issue create` prints the URL only; the number is its last path segment.

## Blocked-by dependencies

```sh
# blocked_by lives on the BLOCKED issue and takes the blocker's database id
gh api --method POST repos/O/R/issues/<blocked_number>/dependencies/blocked_by \
  -F issue_id=<blocker_id>
gh api repos/O/R/issues/<blocked_number>/dependencies/blocked_by \
  --jq '.[] | "blocked by #\(.number) \(.title)"'
```

Edges are direct, not transitive: mark every real prerequisite, or a card that
needs the skeleton shows unblocked the moment its only listed dep closes.

## Decompose a design into buildable cards

1. Start with the narrowest contract or decision that all implementation tracks
   need. Make it the first card and state that it blocks the tracks behind it.
2. Split independent tracks after that gate. Each card must name the artifact it
   delivers, its test double or fixture boundary, and observable done checks;
   "implement X" is not a testable acceptance criterion.
3. Put the final integration or cutover card after every track it consumes. Do
   not hide deployment, live acceptance, or operator-owned checks inside a code
   card.
4. Write direct dependencies on every blocked card, including all real
   prerequisites rather than relying on transitive inference. Render the graph
   in the review message as `gate -> {parallel tracks} -> integration`.
5. Create cards, attach dependency edges, and add them to the board only after
   the decomposition is approved. Read back the issue bodies, dependency lists,
   and board items; assert the counts match the intended set and every item has
   its intended status.

Pitfalls:
- Keep a task's acceptance checks beside its deliverable — a later test-only
  card lets an implementation appear complete before it can be exercised.
- Mark every direct prerequisite — dependency views are not transitive, so an
  omitted edge makes blocked work appear ready when an intermediate card closes.
- Keep a live cutover separate from package implementation — it needs operator
  access and external state that unit tests cannot prove.

## Projects v2 board

```sh
gh project list --owner <org>                        # number + node id
gh project field-list <n> --owner <org> --format json # Status option ids

# add, then set Status — item-add gives you the item id it returns
gh project item-add <n> --owner <org> --url <issue_url> --format json   # -> {"id": "PVTI_..."}
gh project item-edit --id <item_id> --project-id <PVT_...> \
  --field-id <PVTSSF_...> --single-select-option-id <option_id>
```

Notes:
- There is no "add with fields" verb: add, then `item-edit`. Two calls per card.
- `item-list --format json` reports the select value as a flat `status` key;
  an item added but never edited reads as `status: null` — count those to prove
  every card got its column.
- Read back with `item-list --limit 200` and assert the count equals what you
  created; the add is not the proof, the listing is.

## Batch etiquette

For 20+ cards, drive it from one script with a `state.json` keyed by your own
card key (`number`, `id`, `url`, flags for each wiring step) written after every
call, and split into re-runnable phases — create, link, board, report. A 35-card
deck is ~100 `gh` calls: a mid-run failure otherwise leaves a half-built deck
with no way to resume. Print one line per card so the transcript is the log.
