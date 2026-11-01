# Writing the organisation's board

One project, `aivara-se` #2 (`Development`). A card is an issue; its column is the project's `Status` field. The dispatcher writes only the assignee; until it is live, agents and the operator move cards by hand.

## Columns

- `Backlog` — the operator's inbox and MaMa's; a card is refined here.
- `Refined` — ready to build, and it carries **no assignee**: the rule wakes a `Refined` card only when nobody holds it, so a login left on one strands the card and holds that agent's slot.
- `Started` — one card per builder until its pull request merges.
- `Finished` — merged, and graded against the card's own _Done means_, never the column.

## Read it

```sh
gh project item-list 2 --owner aivara-se --limit 200 --format json > /tmp/board.json
gh project field-list 2 --owner aivara-se --format json   # the Status field and its option ids
```

Parse in code; the terminal truncates the listing. **A card in no column has no `status` key, not an empty string** — a fresh `item-add`, or a hand-move whose field write did not take — so `item['status']` raises `KeyError` and that filter loses the card. Use `item.get('status')`; a missing status is a finding, because the operator said where the card went and the board disagrees. Say so; do not pick a column for them.

`gh issue list --repo aivara-se/<repo>` answers the repository's side and never substitutes for the project listing.

## Write a card

```sh
# 1. the issue is the card
gh issue create --repo aivara-se/<repo> --title "<what is wrong or wanted, in the repository's own register>" --body-file <f>
# 2. put it on the project, and keep the item id it answers
gh project item-add 2 --owner aivara-se --url <issue url> --format json
# 3. set its column
gh project item-edit --id <item id> --project-id PVT_kwDOCHeWGM4BkzFY \
  --field-id PVTSSF_lADOCHeWGM4BkzFYzhjiWv8 --single-select-option-id <option>
# 4. and claim it where the column calls for a holder
gh issue edit <n> --repo aivara-se/<repo> --add-assignee thani-sh-mama
```

`Status` option ids on #2: `Backlog` `4fe3df6b`, `Refined` `f75ad846`, `Started` `47fc9ee4`, `Finished` `98236657`. If a command is refused, re-derive rather than guess: `gh project list --owner aivara-se --format json` for the project id, `gh project field-list 2 --owner aivara-se --format json` for the field and its options.

**A card the operator asks for and this agent builds is written complete in the same turn.** The body carries _what to build_ and _Done means_ — a card is a spec, not a note of intent. Put it in `Started` with the builder's login; branch, commit, push and pull request follow in that turn. The merge does not: request the operator and a peer, and leave it — that merge is also what ends the card.

## What the agent token cannot prove

- **Webhooks.** An organisation webhook needs `admin:org_hook` to list; a repository webhook needs `admin:repo_hook`. The fix is the operator's `gh auth refresh -h github.com -s admin:org_hook`, or their word — never infer from a card's column that a service is deployed.
- Name the scope a check is missing instead of reporting the check as failed or passed.
