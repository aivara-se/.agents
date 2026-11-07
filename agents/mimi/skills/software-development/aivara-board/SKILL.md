---
name: aivara-board
description: Use when working an aivara-se Development board card.
when-to-use: Picking up, starting or reading a card on the aivara-se Development project (resolve its number from the project list first), including the Status move an agent makes for its own card.
---

# The aivara-se board

One GitHub project: org `aivara-se` titled `Development`. Read its number from the project list; do not trust the number written below. A card is an issue; its column is the project's `Status` single-select field. Columns: `Backlog`, `Refined`, `Started`, `Finished`.

The dispatcher **never** writes a field but the assignee and **never** moves a card. An agent moves **its own** card to `Started` when it starts building. Change nothing else by hand.

## Read the board

```sh
gh api graphql -f query='{ organization(login:"aivara-se"){ projectV2(number:2){ id title fields(first:30){ nodes{ ... on ProjectV2SingleSelectField { id name options { id name } } } } } } }'
```

**Check the `title` the query returns before you read any items.** A project is renumbered when the operator rebuilds or renames one, so a number that once named `Development` can point at a different board whose item list is legitimately empty. If the title is not `Development`, list `projectsV2(first:20){ nodes{ number title } }`, take the number that matches, and use its ids — every id below is per project and dies with a rebuild.

Ids are per project, not per card: project `PVT_kwDOCHeWGM4BkzFY`, Status field `PVTSSF_lADOCHeWGM4BkzFYzhjiWv8`, options `4fe3df6b` Backlog / `f75ad846` Refined / `47fc9ee4` Started / `98236657` Finished. Re-ask when a mutation is rejected; a rebuilt board changes them.

The items query is the read the service makes — `repository { nameWithOwner }`, `fieldValueByName(name:"Status")`, `assignees(first:1)`:

```sh
gh api graphql -f query='{ organization(login:"aivara-se"){ projectV2(number:2){ title items(first:60){ totalCount nodes{ content{ ... on Issue { number title repository{name} state } } status:fieldValueByName(name:"Status"){ ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }'
```

A card is `owner/name#number`, never the number alone. Read `totalCount` before `nodes`: empty `nodes` is a fact only when the count agrees. Zero against a non-zero count means a dropped alias or fragment — re-ask before reporting an empty board. Zero under an unexpected `title` is a different board, not an empty one.

## Move a card to Started

Two lookups, then the mutation:

```sh
gh api graphql -f query='{ repository(owner:"aivara-se", name:"<repo>"){ issue(number:<n>){ projectItems(first:5){ nodes{ id project{ number } } } } } }'

gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(input:{ projectId:"PVT_kwDOCHeWGM4BkzFY" itemId:"<PVTI_...>" fieldId:"PVTSSF_lADOCHeWGM4BkzFYzhjiWv8" value:{ singleSelectOptionId:"47fc9ee4" } }){ projectV2Item { id } } }'
```

Read the field values back: a returned id is not a changed column. The assignee write is REST, not a project mutation — `PATCH /repos/<owner>/<name>/issues/<n>` with `{"assignees":["<login>"]}`.

## Open a card

Nothing auto-adds an issue: create it, add the item, set `Status` to `Backlog` — the operator's inbox, MaMa's to refine, never `Refined` or `Started`.

```sh
url=$(gh issue create --repo aivara-se/<repo> --title "<one line>" --body-file <path>)
item=$(gh project item-add <number> --owner aivara-se --url "$url" --format json --jq '.id')   # the number the project list gives for `Development`
```

```sh
gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(input:{ projectId:"PVT_kwDOCHeWGM4BkzFY" itemId:"<PVTI_...>" fieldId:"PVTSSF_lADOCHeWGM4BkzFYzhjiWv8" value:{ singleSelectOptionId:"4fe3df6b" } }){ projectV2Item { id } } }'
```

Body: what is broken, the reproduction with its commands and result, _What to build_, _Done means_, the owner. A defect card without a reproduction makes the next reader re-derive it.

## Card states and who holds them

- `Backlog` — MaMa refines; an agent's card starts here.
- `Refined` — a developer holding no other card builds it; the lowest-numbered Refined card wins under the operator's tiebreak.
- `Started` — holds while its pull request is open.
- `Finished` — the pull request merged.

Work it to a merged pull request: branch; PR body naming what changed, what was verified and how, what was left out; review from `thani-sh` and one peer. Merging is MaMa's, and the merge moves the card to `Finished`.

## A card that already has an open pull request

"Move this card forward" may need only a read and a handoff, not a build. Read first.

```sh
gh pr view <n> --json number,state,headRefOid,mergeable,mergeStateStatus,reviewDecision,reviews,requestedReviewers,isDraft
gh pr checks <n>                                   # the host's own list
gh api repos/<owner>/<name>/pulls/<n>/reviews      # verdicts, with the commit each was given for
gh api repos/<owner>/<name>/pulls/<n>/comments     # inline findings; one review carries its findings in the body, inline, or both — read both
gh api repos/<owner>/<name>/commits/<sha>/check-runs --jq '.check_runs[] | "\(.name) \(.status) \(.conclusion)"'   # a host integration can be missing from `gh pr checks`
```

Re-read after any push: a push dismisses the approval. `mergeStateStatus` reflects review requirements — unmet reads `BLOCKED`, satisfied `CLEAN` — so `CLEAN` + `APPROVED` means nothing blocks. Re-verify _Done means_ on the head; the PR body is a claim, not evidence.

The rule row names who acts next (`PRODUCT.md`, _The rule_): approved and mergeable is **MaMa's to merge**; review requested, the reviewer's; changes requested, the author's; `Started` with no run in flight, its assignee's. Hand the merge over; do not merge or move the card.

## Answering a changes-requested review

Fix the tree, push, then reply with `Applied at <sha>` and one bullet per finding: what changed and where; a rejected finding gets its reason. Re-request the reviewer in the same act (`gh pr edit <n> --add-reviewer <login>`): a push restores no verdict, so `reviewDecision` stays `CHANGES_REQUESTED` until it is re-read.

A finding that a number in your body does not reproduce is real — edit the body, do not re-argue. For a false cost or bound, narrow the claim and open the `Backlog` card in the same round.

## Hand work to another agent

The channel is the GitHub thread: a comment emails that repository's watchers, so it is how an agent is asked to act when no dispatcher runs. The same mail reaches each alias, so `himalaya envelope list -a mimi` indexes fleet activity. Answer on the thread, two lines: the rule row and actor, then any ordering fact (two pull requests on one file — the merger orders the pair).

## Rules that block a merge but are not the review

From the Baseline ruleset (`.github`, _Repository settings_): one approval (not the author's), rebase-only, linear history, and **an unattributable commit needs one approval beyond that**. Confirm with `gh api repos/<owner>/<name>/commits/<sha> --jq '.author.login'`; null is that extra approval.

## A card whose work is the documents

Every bullet can be a document act, with _Done means_ "the documents state X … true of the tree". The code is the arbiter: check a behaviour claim against the tree — the struct, the deciding branch, the test that pins it.

A reading the card says was _decided_ elsewhere lives in the predecessor's PR body, under _Readings the card left open_. Read it; say which you took and why. Write each fact once in its home and point other files at it; a copy that reads the other way is a finding wherever it sits.

**A bound must name the set it holds over.** "At most one extra run per agent" is false once a run exists its mechanism cannot see — started by a dead service, held by no table the rule reads. Write the set into the sentence (_for the runs the runner holds_) and answer the case outside it. Read the deciding branch, not the comment above it.

## Staleness

- **A number belongs to the head it was measured on.** Re-measure before quoting a reviewer's count, at the commit your body will be read against: a merge or force-push shifts every line. Local `main` lags `origin/main`, so `git fetch origin`, branch from `origin/main`, then `grep -n` and `git ls-files <glob> | wc -l`.
- **Read the state when you answer.** A merge can land in between. `null` / `unknown` after a `CLEAN` is a recompute, not a blocker: re-poll, then read `state`, `merged`, `mergedAt`, `mergeCommit` and report the delta.
- **Expect the merge to sit.** Until the service is live, merging is an operator act: see who presses it (`gh pr list --state merged --limit 10 --json number,mergedBy`) and say the wait in one line.
- **Finish the card after the merge** — tree-id check, cleanup, issue and column read back: `references/verifying-a-merge.md`.
