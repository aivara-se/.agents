# Writing the organisation's board

One project, `aivara-se` #2 (`Development`). A card is an issue; its column is the project's `Status` field. The dispatcher writes only the assignee; until it is live, agents and the operator move cards by hand.

## The columns and their rule

- `Backlog` — the operator's inbox, and MaMa's: a card is refined here.
- `Refined` — ready to build, and it carries **no assignee**: the rule wakes a `Refined` card only when nobody holds it, so leaving a login on one strands the card and holds that agent's slot.
- `Started` — being built; one card per builder until its pull request merges.
- `Finished` — merged, and graded against the card's own *Done means*, never against the column.

## Read it

```sh
gh project item-list 2 --owner aivara-se --limit 200 --format json > /tmp/board.json
gh project field-list 2 --owner aivara-se --format json   # the Status field and its option ids
```

Parse in code; the listing truncates in a terminal. **A card in no column has no `status` key, not an empty string** — a fresh `item-add`, or a hand-move whose field write did not take — so `item['status']` raises `KeyError` and any filter written that way loses the card. Use `item.get('status')`, and treat a missing status as a finding: the operator said where the card went and the board disagrees, so say so rather than choosing a column on their behalf.

`gh issue list --repo aivara-se/<repo>` answers the repository's side of a question and never substitutes for the project listing.

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

`Status`'s option ids on project #2: `Backlog` `4fe3df6b`, `Refined` `f75ad846`, `Started` `47fc9ee4`, `Finished` `98236657`. If a command is refused, re-derive rather than guess: `gh project list --owner aivara-se --format json` for the project's id, `gh project field-list 2 --owner aivara-se --format json` for the field's and its options'.

**A card the operator asks for and this agent then builds is written complete in the same turn.** The body carries *what to build* and *Done means*, because a card is a spec and not a note of intent; the card goes in `Started` with the builder's login; the branch, commit, push and pull request follow in that turn. The merge does not: request the operator and a peer and leave it, which is also what ends the card.

## What the agent token cannot prove

- An **organisation webhook** needs `admin:org_hook` to list. The fix is the operator's `gh auth refresh -h github.com -s admin:org_hook`, or their word — never infer that a service is deployed from a card's column.
- A **repository webhook** needs `admin:repo_hook`, same shape.
- Name the scope a check is missing instead of reporting the check as failed or passed.
