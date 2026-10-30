---
name: aivara-board
description: Use when working an aivara-se Development board card.
when-to-use: Picking up, starting, or reading a card on the aivara-se Development project (project 2), including the Status move an agent makes for its own card and the read behind it.
---

# The aivara-se board

One GitHub project, org `aivara-se`, number `2` (title `Development`); a card is an issue and its column is the project's `Status` single-select field. Columns: `Backlog`, `Refined`, `Started`, `Finished`.

A service rule and an agent rule are different things: the dispatcher **never** writes a field but the assignee and **never** moves a card; an agent moves **its own** card to `Started` when it starts building, which is the operator's standing ask. Only the project's `Status` is moved — nothing else on a card changes by hand.

## Read the board

```sh
gh api graphql -f query='{ organization(login:"aivara-se"){ projectV2(number:2){ id title fields(first:30){ nodes{ ... on ProjectV2SingleSelectField { id name options { id name } } } } } } }'
```

The ids are stable per project, not per card: project `PVT_kwDOCHeWGM4BkzFY`, Status field `PVTSSF_lADOCHeWGM4BkzFYzhjiWv8`, options `4fe3df6b` Backlog / `f75ad846` Refined / `47fc9ee4` Started / `98236657` Finished. Re-ask the query when a mutation is rejected; ids change if the board is rebuilt.

A card's column, assignee and repository — the read the service itself does — comes from the project items query: `repository { nameWithOwner }`, `fieldValueByName(name:"Status")`, `assignees(first:1)`. An issue number is its own repository's, so a card is `owner/name#number`, never the number alone.

```sh
gh api graphql -f query='{ organization(login:"aivara-se"){ projectV2(number:2){ title items(first:60){ totalCount nodes{ content{ ... on Issue { number title repository{name} state } } status:fieldValueByName(name:"Status"){ ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }'
```

Read `totalCount` before reading `nodes`: an empty `nodes` is a fact only when the count agrees. A zero count with a non-zero one means the field alias or a `... on Issue` fragment dropped the entries, not that the board is empty — re-ask before reporting it empty.

## Move a card to Started

Two lookups, then the mutation: the card's issue node carries its project item id.

```sh
gh api graphql -f query='{ repository(owner:"aivara-se", name:"<repo>"){ issue(number:<n>){ projectItems(first:5){ nodes{ id project{ number } } } } } }'

gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(input:{ projectId:"PVT_kwDOCHeWGM4BkzFY" itemId:"<PVTI_...>" fieldId:"PVTSSF_lADOCHeWGM4BkzFYzhjiWv8" value:{ singleSelectOptionId:"47fc9ee4" } }){ projectV2Item { id } } }'
```

Read the item's field values back after the mutation — a mutation that returns an id is not a column that changed. The assignee write the service makes is the REST issue endpoint (`PATCH /repos/<owner>/<name>/issues/<n>` with `{"assignees":["<login>"]}`), not a project mutation.

## Open a card

A new issue is not on the board by itself — nothing auto-adds it — and an agent makes the add the same way MaMa does. Create the issue, add the item, then set `Status` to `Backlog`: a new card is the operator's inbox and MaMa's to refine, never `Refined` or `Started`.

```sh
url=$(gh issue create --repo aivara-se/<repo> --title "<one line>" --body-file <path>)
item=$(gh project item-add 2 --owner aivara-se --url "$url" --format json --jq '.id')
```

```sh
gh api graphql -f query='mutation { updateProjectV2ItemFieldValue(input:{ projectId:"PVT_kwDOCHeWGM4BkzFY" itemId:"<PVTI_...>" fieldId:"PVTSSF_lADOCHeWGM4BkzFYzhjiWv8" value:{ singleSelectOptionId:"4fe3df6b" } }){ projectV2Item { id } } }'
```

Read the item's `Status` back after the mutation. Body shape: what is broken, the reproduction with its commands and the observed result, *What to build*, *Done means*, and who it belongs to — a card that names a defect without a reproduction is one the next reader has to re-derive.

## Card states and who holds them

- `Backlog` — MaMa refines; an agent's card starts here.
- `Refined` — a developer holding no other card builds it; the lowest-numbered Refined card wins under the operator's tiebreak.
- `Started` — being built; the card sits here while its pull request is open. An agent moved it here itself.
- `Finished` — the pull request merged.

A card is worked to a merged pull request: branch, PR with the body naming what changed, what was verified and how, and what was left out, review requested from `thani-sh` and one peer agent. Merging is MaMa's. Do not move a card to `Finished` yourself — the merge is what moves it.

## A card that already has an open pull request

"Move this card forward" is not always a build ask. A card can be built, reviewed and mergeable already, and the work left is a read plus a handoff. Read the state before touching code or reopening the build.

```sh
gh pr view <n> --json number,state,headRefOid,mergeable,mergeStateStatus,reviewDecision,reviews,requestedReviewers,isDraft
gh pr checks <n>                                   # the host's own list
gh api repos/<owner>/<name>/pulls/<n>/reviews      # verdicts, with the commit each was given for
gh api repos/<owner>/<name>/pulls/<n>/comments     # inline findings; one review carries its findings in the body, inline, or both — read both
gh api repos/<owner>/<name>/commits/<sha>/check-runs --jq '.check_runs[] | "\(.name) \(.status) \(.conclusion)"'   # a host integration can be missing from `gh pr checks`
```

`gh pr view` numbers are cheap and always stale-able: read them again after any push, since a push dismisses the approval it was given for. `mergeStateStatus` is the host's own verdict on the rules and it does reflect review requirements — an unmet review reads `BLOCKED`, a satisfied one `CLEAN` — so `CLEAN` + `reviewDecision: APPROVED` means nothing is blocking the merge. Then re-verify the card's *Done means* on the head yourself; the PR body is a claim, not evidence.

The rule row names who acts next (`PRODUCT.md`, *The rule*): an approved and mergeable pull request is **MaMa's to merge**; a review requested is the named reviewer's; changes requested is the author's; a `Started` card with no run in flight is its assignee's, to finish or restart. So when the PR is approved and mergeable, the merge is the card's last step and it is not the builder's: hand it over, do not merge it, and do not move the card.

When the process itself is unclear, the record of how the previous card of the same shape concluded is in the past sessions — one-shot, one per card (`session_search`).

## Answering a changes-requested review

The review is the author's to clear: fix the tree, push, then reply on the pull request with `Applied at <sha>` and one bullet per finding — what changed and where; a rejected finding gets its reason in the same list. Re-request the reviewer in the same act (`gh pr edit <n> --add-reviewer <login>`): a push does not restore a verdict, and `reviewDecision` stays `CHANGES_REQUESTED` until the reviewer re-reads. Treat your body as an artifact under review — a finding that a number in it does not reproduce is a real finding, so edit the body and say so rather than re-arguing it.

A finding that a cost, bound or entry set is false of the tree is settled by narrowing the claim and opening the card for the missing behaviour: create it in `Backlog` (see *Open a card*) in the same round, so the reviewer sees the case carried, not argued away.

## Hand work to another agent

The fleet's channel is the GitHub thread: a comment on the issue or pull request becomes a notification email to that repository's watchers, so it is how an agent is asked to act when no dispatcher is running. There is no queue and no separate inbox for it — the topic repository is the place, and the reason is the rule's own words. The same notifications also arrive as mail at each agent's alias, so `himalaya envelope list -a mimi` is a fast index of recent fleet activity — reviews, comments, merges and the auto-closes — while the thread stays the place an ask is answered. Keep it two lines: the rule row that applies and the actor, then any ordering fact (two open pull requests touching the same file, and which lands first — the merger orders the pair).

## Rules that block a merge but are not the review

From the Baseline ruleset (`.github`, *Repository settings*): one approval (the author's own does not count), rebase-only, linear history, and **a commit GitHub cannot attribute to an account needs one approval beyond that** — work pushed under an identity not linked to its account takes a second review. Confirm attribution before calling a pull request ready: `gh api repos/<owner>/<name>/commits/<sha> --jq '.author.login'` — a null there is the extra approval.

## A card whose work is the documents

A card can ask for no code: every bullet is a document act and *Done means* is "the documents state X … the claim is true of the tree". Then the code is the arbiter, not the card: a claim about behaviour (what a restart costs, what a table holds) must be read back against the tree — the struct, the branch that decides it, and the test that pins it — before it is written, or the review opens with the record and the tree disagreeing.

When a card says a reading was *decided* elsewhere ("Decide inside this task: the marker …"), the decision usually lives only in the predecessor card's pull-request body, under its own *Readings the card left open* heading — read that before designing, and say in your body which reading you took and why. Where a document names a fact, write it once in the home and make the other files point at the home; a copy that reads the other way is a finding, in whatever file carries it, including the ones the card did not name.

**A bound must name the set it holds over, and every named cost traced through its mechanism.** "At most one extra run per agent" reads as universal and is false the moment a run exists that the mechanism it rests on cannot see — one started by a service that is gone, held by no table the rule reads; write the set into the sentence (*for the runs the runner holds*) and answer the case outside it, or the reviewer produces the counterexample instead of the code producing the bound. Read the deciding branch, not the comment above it: a claim about what survives a restart or what becomes an entry is settled by the struct and the branch, and the mechanism — not the happy path — is what the bound rests on.

## Staleness: re-read before you answer

- **A number belongs to the head it was measured on — a reviewer's and your own.** Re-measure at the current head before quoting a reviewer's count (conflict hunks, tests run). Before your own body cites a `path:line`, a tracked-file count or a test count, measure it at the commit the body will be read against: a merge or force-push under the branch shifts every line number, and a local clone's `main` runs behind `origin/main`, so `git fetch origin`, branch from `origin/main`, then `grep -n` and `git ls-files <glob> | wc -l` — never from a tree read before the branch landed.
- **Read the state again at the moment you answer.** A merge can land between your first read and your reply — and `mergeable` / `mergeable_state` returning `null` / `unknown` after an earlier `CLEAN` is the host re-computing after a push or a merge, not a new blocker: re-poll, then read `state`, `merged`, `mergedAt`, `mergeCommit` and report the delta rather than the whole status again.
- **Expect the merge to sit.** Until the service is live, merging is an operator act, not an agent's: see who is actually pressing it with `gh pr list --state merged --limit 10 --json number,mergedBy`, and say the wait in one line instead of repeating the rule back.
- **Finish the card after the merge** — tree-id check, cleanup, and reading the issue and the column back: `references/verifying-a-merge.md`.
