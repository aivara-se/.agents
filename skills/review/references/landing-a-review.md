# Landing a review

From an approved verdict to a merged commit: what to run, where, and how to read the result.

## Run it at the head

- `git fetch origin` brings branches, not pull request heads. Fetch the head: `git fetch origin pull/<n>/head:pr<n>`.
- Review in a detached worktree at the exact sha, not in the shared clone:

```sh
cd ~/github/aivara-se/<repo>
git fetch origin pull/<n>/head:pr<n>
git worktree add -q --detach /root/wt-<tag> <headRefOid>
```

- A fresh worktree has no `node_modules`. Run `bun install --frozen-lockfile` there first, or the gate fails on the install.
- Re-read `headRefOid` immediately before posting. A rebase during the run moves it.

## A failing gate is a baseline until proven otherwise

- Run the same gate on the default branch. `PRODUCT.md: not found` fails on `main` too, so it is the repository's state.
- Say so in the review body — "the same as on `main`" — so the next reader does not reopen it.
- Keep the verdict on what the change did, not on what the repository never had.
- The organisation's shared checkers are `workflow_call` jobs in another repository. Run one from that checkout against the worktree: `bun run scripts/validate-docs.ts /root/wt-<tag> --require`.

## One record, many repositories

- A document copied into each repository — an ADR, a standard, a README block — is reviewed copy by copy.
- Run every repository's own gate at its own head. One copy meets a different tree, and another may not compile.
- Diff the copies against each other. The identical body is the rule; the differing opening is the local force.
- Grep each repository for the pointer the change claims to fix: `grep -rn '<path>' --exclude=<file> .`. Zero hits is the claim, in one line.
- A false line outside the diff goes in the body as an issue with its path, never as a requested change.

## Proving a comment's claim

- A comment that says "`tests/x.test.ts` pins this" is a claim with a falsifier.
- Break the rule it names, run the test, and watch it fail.
- Restore from git with `git checkout -- <path>`, never from a hand-kept copy, and never leave the mutant in the tree.
- Name the failures you saw when you post. "The test exists" is not the check.

## Two pull requests on one file

- Order them by their diffs, the small insert first, and re-read `mergeable` after each lands.
- A resolved conflict keeps both sides apart: git holds the shared opening line above the markers. The second side arrives without its own, so pasting the two together splices them into one object.
- Count the entries and read the seam. A file that parses need not hold both changes.

## Enqueue and verify

```sh
gh pr review <n> --repo aivara-se/<repo> --approve --body-file <path>
gh pr merge <n> --repo aivara-se/<repo> --rebase
gh api graphql -f query='query{repository(owner:"aivara-se",name:"<repo>"){pullRequest(number:<n>){state mergeStateStatus isInMergeQueue mergeQueueEntry{state position}}}}'
```

- The press can exit 0, print the strategy line, and still leave an empty queue. Re-pressing changes nothing.
- Enqueue by node id when the queue is empty:

```sh
ID=$(gh pr view <n> -R aivara-se/<repo> --json id -q .id)
gh api graphql -f query='mutation($id:ID!){enqueuePullRequest(input:{pullRequestId:$id}){mergeQueueEntry{state position}}}' -f id="$ID"
```

- `QUEUED` with a position is the entry you were owed. Poll `isInMergeQueue` until the pull request reads `MERGED`.
- The REST surface has no merge-queue enqueue: `PUT /pulls/<n>/enqueue` is 404, and `PUT /pulls/<n>/merge` is 405.
- Three queued in a row can land within a minute. An entry `AWAITING_CHECKS` for minutes is a slow runner, not a stuck press.
- The arm may stay armed SQUASH while the queue lands a rebase. Read the merge commit's parents, not the arm.
- One parent is a squash, two is a rebase. Report the method that landed, not the one the ruleset names.
