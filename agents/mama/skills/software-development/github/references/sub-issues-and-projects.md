# Sub-issues and Projects v2 boards

`gh` has no porcelain for these; both are `gh api`/`gh project` calls. Sub-issues and dependencies exist in REST; the board is `gh project`.

## Sub-issues (parent/child)

```sh
# parent side: who is under this issue (the authoritative read-back)
gh api repos/O/R/issues/<parent_number>/sub_issues --jq '.[] | "\(.number) \(.title)"'

# attach a child to a parent — child is its DATABASE id, not its number
gh api --method POST repos/O/R/issues/<parent_number>/sub_issues \
  -F sub_issue_id=<child_id>
```

Get the id once at creation: `gh api repos/O/R/issues/<n> --jq .id`.

- A child belongs to **one** parent; a second attach moves it, silently.
- The child's own payload reports `parent_issue: null` and a zero `sub_issues_summary` even when the link exists. Verify from the **parent's** `sub_issues` list, never from the child.
- `gh issue create` prints the URL only; the number is its last path segment.

## Blocked-by dependencies

```sh
# blocked_by lives on the BLOCKED issue and takes the blocker's database id
gh api --method POST repos/O/R/issues/<blocked_number>/dependencies/blocked_by \
  -F issue_id=<blocker_id>
gh api repos/O/R/issues/<blocked_number>/dependencies/blocked_by \
  --jq '.[] | "blocked by #\(.number) \(.title)"'
```

Edges are direct, not transitive: mark every real prerequisite, or a card that needs the skeleton shows unblocked the moment its only listed dep closes.

## Decompose a design into buildable cards

1. Start with the narrowest contract every track needs; make it the first card.
2. Split tracks after that gate. Each card names its artifact, its test double or fixture boundary, and observable done checks — "implement X" is not testable. Keep acceptance checks beside the deliverable: a later test-only card lets work look complete before it can be exercised.
3. Put integration or cutover last. Keep live cutover separate from package work — it needs operator access and state unit tests cannot prove — and never hide deployment or operator checks in a code card.
4. Write direct dependencies on every blocked card, and render the graph in the review message as `gate -> {parallel tracks} -> integration`.
5. Create cards, edges and board items only after the decomposition is approved; read back bodies, dependencies and items, and assert the counts and statuses.

## Projects v2 board

```sh
gh project list --owner <org>                        # number + node id
gh project field-list <n> --owner <org> --format json # Status option ids

# add, then set Status — item-add gives you the item id it returns
gh project item-add <n> --owner <org> --url <issue_url> --format json   # -> {"id": "PVTI_..."}
gh project item-edit --id <item_id> --project-id <PVT_...> \
  --field-id <PVTSSF_...> --single-select-option-id <option_id>
```

- There is no "add with fields" verb: add, then `item-edit`. Two calls per card.
- `item-list --format json` reports the select value as a flat `status` key; an item added but never edited reads as `status: null` — count those to prove every card got its column.
- Read back with `item-list --limit 200` and assert the count equals what you created; the add is not the proof, the listing is.

## Batch etiquette

For 20+ cards, use one script with a `state.json` keyed by card (`number`, `id`, `url`, per-step flags), written after every call, in re-runnable phases: create, link, board, report. A mid-run failure otherwise leaves a half-built deck with no way to resume. Print one line per card so the transcript is the log.
