---
name: product-status-report
description: "Use when asked for a status report on the lab's products."
version: 1.0.0
author: MiMi (thani-sh-mimi)
license: MIT
metadata:
  hermes:
    tags: [reporting, product, sdlc, agent-fleet]
    related_skills: [aivara-board, writing, product-direction-research]
---

# The products' status

Answer "what shipped, what is open, what is next" from the repositories: one measured line per product, the open queue with who acts next, and one recommendation. The operator reads it to decide, not to be reassured.

## When to Use

- The operator asks for a status report, a round-up, or "what's done and what's next".
- A discussion turn has to state the current state of more than one product.

## Procedure

1. **List the products by activity, not by description.** Sort by `pushed_at`; the description field is marketing and drifts.
   ```sh
   gh api "orgs/aivara-se/repos?per_page=100" \
     --jq '.[] | "\(.pushed_at)\t\(.name)\t\(.description)"' | sort -r
   ```
2. **Recent merges in one org-wide call.** Per-repo `gh pr list --state all` is unsorted by merge and misses the repos you did not think of.
   ```sh
   gh search prs --owner aivara-se --merged --merged-at '>YYYY-MM-DD' --limit 50 \
     --json repository,number,title,closedAt,author \
     --jq '.[] | "\(.closedAt)\t\(.repository.name)#\(.number)\t\(.author.login)\t\(.title)"' | sort
   ```
   The window is the report's "recently"; name it in the answer when it is not the last week.
3. **A merge is not a release.** For each shipping product read the tags, not the PR titles: `gh release list -R aivara-se/<repo> -L 3`, then `gh release view <tag> -R aivara-se/<repo> --json body,publishedAt`. Report the version with its date, and put merged-but-unreleased work in the queue, not in "done".
4. **Read the queue at the moment of answering.**
   ```sh
   gh pr list -R aivara-se/<repo> --state open --json number,title,mergeable,mergeStateStatus,reviewDecision,author
   gh issue list -R aivara-se/<repo> --state open --json number,title,labels,updatedAt
   ```
   Give each entry as `repo#number` with the row that names who acts next: approved and mergeable is MaMa's to merge, changes requested is the author's, an open issue with no card and no owner is nobody's — that is the finding, say it.
5. **Read origin, not the clone.** Clones under `~/github` run days behind; every claim comes from `gh` against the remote. If you must quote `PRODUCT.md` from a clone, `git fetch origin` first and read the file at `origin/main`.
6. **Check a product's documents only for what it claims to be.** `PRODUCT.md` says what the product does; it never says what a user can download today.
7. **End on one recommendation** — the item you would take next and the reason, in one sentence. A report with no recommendation hands the sorting back to the operator.

## Shape of the answer

- One line per product, newest fact first, each carrying a number, a version or a date. No adjectives.
- Then the open queue: `repo#number`, its state, who acts next.
- Then the recommendation.
- Length is `writing`'s rule, not yours: this is a message, not a document. Asked inside a discussion, it is one message, and it names by handle the person who acts next.

## Pitfalls

- **Do not sum a queue you did not enumerate.** Any count you state is the length of the list you printed; a total that disagrees with the rows is wrong, and a silently truncated `--limit` is how it happens.
- **Interesting is not shipped.** A spike, an experiment page, a brainstorm card or a merged blog post is not a product change; keep it in its own clause or leave it out.
- **A release note enumerates PRs; the product fact is the version and what changed for the user.** Do not paste the changelog bullet list into the answer.
- **Do not report card columns as product state.** Card columns are a queue, and the project must be resolved by title before its items mean anything — see `aivara-board`.
- **A board or list that reads empty is a question, not a fact.** Confirm the query's identity fields (`title`, `totalCount`) before you report the emptiness.
