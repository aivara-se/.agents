# Auditing a repository's review loop

## When to Use

Use when a review process churns — "PRs balloon", "reviews spin out of control", "we end up building the opposite" — or before you change a review rule. One review tells you nothing; many rounds do.

## Collect

Rank every pull request by size and rounds:

```sh
gh pr list -R <owner>/<repo> --state all --limit 50 \
  --json number,title,state,additions,deletions,changedFiles,reviews \
  --template '{{range .}}{{.number}} {{.state}} +{{.additions}}/-{{.deletions}} files={{.changedFiles}} reviews={{len .reviews}} {{.title}}{{"\n"}}{{end}}'
```

Read the worst one whole — body, every review, in order:

```sh
gh pr view <n> -R <owner>/<repo> --json title,body,reviews \
  --template '{{.title}}{{"\n"}}{{.body}}{{"\n"}}{{range .reviews}}--- {{.author.login}} [{{.state}}]{{"\n"}}{{.body}}{{"\n"}}{{end}}'
```

## Closed unmerged is the signal subset

Most rounds end in a merge; the ones that did not show the loop's cost. Sweep them first.

`--state closed` includes merged pull requests, so filter on `mergedAt` in code. Never use a `{{if not .mergedAt}}` template: gh's `not`/`sub` are not reliable there, and a filter that matches everything makes a merged PR read as abandoned.

```sh
gh pr list -R <owner>/<repo> --state closed --limit 100 \
  --json number,title,mergedAt,additions,changedFiles,reviews \
  | jq -r '.[] | select(.mergedAt == null) | "\(.number) +\(.additions) files=\(.changedFiles) reviews=\(.reviews|length) \(.title)"' \
  | sort -k4 -t= -nr
```

For each PR with more than two rounds, read the close event, the actor, then the replacement:

```sh
gh api repos/<owner>/<repo>/issues/<n>/timeline --paginate \
  | jq -r '.[] | select(.event == "closed" or .event == "commented") | "\(.event) \(.actor.login): \(.body // "" | .[0:200])"'
```

- **Who closed it, and what the replacement says, is the finding.** "Supersedes #X" plus "later commits not included", or "reissued as a smaller change", means the rounds' product was discarded and the merged tree is the original cut.
- **Compare against the replacement.** Twelve reviews and seven fix commits replaced by the original cut plus one approval is the argument for a round cap; the difference is the price of the loop.
- **A premise removed by a later decision is not a review failure.** Nothing in the change was wrong and no review rule can fix it. Report it separately.

## Read the shape

- **Many rounds on a small diff** — not converging. A dozen reviews on under a hundred lines is a ratchet, not thoroughness.
- **A fix that writes new text** — a finding on a line a previous fix added: the reviewer audits the repair as new work.
- **A large diff under one title** — versions folded in by rebase. Compare the body's claim with `changedFiles`.
- **A blocker on a file the diff never touched** — the author cannot apply it, so the reviewer is writing the change.
- **Two PRs for one decision** — re-litigated inside review. Work closed because the record under it was rewritten is the "built the opposite" signal.
- **A settled-this-round paragraph every round** — the report carries a run log, which costs a wake and changes nothing.

## Conclude

- Count findings that defend the item's contract, not findings that are true. Only the second test converges.
- Price each round: reviews x files touched. That number is the cost, not the tone of one review.
- Check outside practice before proposing a rule — Google's eng-practices guide, Conventional Comments' blocking split, blame-aware scoping, the two-round cap in agent-review postmortems. Local data plus outside practice is a rule; either alone is a guess.
- Fix the rule that governs the step, not the complaint.
- **Make the rule a gate, not a virtue.** "Build the smallest thing" was written down and still failed: it cannot be inspected when a finding is made. A rule bites when one occurrence answers yes or no — every finding names the line it defends; a round after the first opens no new subject; a fix corrects what the change put there. A rule you cannot check against one pull request is a restatement of the complaint.
