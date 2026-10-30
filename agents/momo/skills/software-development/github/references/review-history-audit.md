# Auditing a repository's review loop

## When to Use

Use when a review process is reported to churn — "PRs balloon", "reviews spin out of control", "we end up building the opposite" — or before changing a review rule. One review tells you nothing; the shape of many rounds does.

## Collect

Rank every pull request by size and rounds:

```sh
gh pr list -R <owner>/<repo> --state all --limit 50 \
  --json number,title,state,additions,deletions,changedFiles,reviews \
  --template '{{range .}}{{.number}} {{.state}} +{{.additions}}/-{{.deletions}} files={{.changedFiles}} reviews={{len .reviews}} {{.title}}{{"\n"}}{{end}}'
```

Then read the worst one whole — body, every review, in order:

```sh
gh pr view <n> -R <owner>/<repo> --json title,body,reviews \
  --template '{{.title}}{{"\n"}}{{.body}}{{"\n"}}{{range .reviews}}--- {{.author.login}} [{{.state}}]{{"\n"}}{{.body}}{{"\n"}}{{end}}'
```

## Closed unmerged is the signal subset

Most rounds end in a merge; the ones that did not are where the loop's cost shows. Sweep them before reading anything else.

`--state closed` includes merged pull requests, so filter on `mergedAt` in code. Do not filter with a `{{if not .mergedAt}}` template: gh's template functions are limited and `not`/`sub` are not reliable there — a filter that silently matches everything is how a merged pull request gets read as abandoned.

```sh
gh pr list -R <owner>/<repo> --state closed --limit 100 \
  --json number,title,mergedAt,additions,changedFiles,reviews \
  | jq -r '.[] | select(.mergedAt == null) | "\(.number) +\(.additions) files=\(.changedFiles) reviews=\(.reviews|length) \(.title)"' \
  | sort -k4 -t= -nr
```

For each with more than two rounds, read the close event and the actor, then the replacement:

```sh
gh api repos/<owner>/<repo>/issues/<n>/timeline --paginate \
  | jq -r '.[] | select(.event == "closed" or .event == "commented") | "\(.event) \(.actor.login): \(.body // "" | .[0:200])"'
```

- **Who closed it, and what the replacement says, is the finding.** A body that opens "Supersedes #X" and says the later commits are not included, or a close comment that the change is "reissued as a smaller change", means the rounds' product was discarded — the merged tree is the original cut.
- **Compare against the replacement.** Reviews, commits and additions of the closed pull request against the one that merged. Twelve reviews and seven fix commits replaced by the original cut plus one approval is the whole argument for a round cap; the difference is the price of the loop.
- **A premise removed by a later decision is not a review failure.** When an operator change or a merged decision makes the item unnecessary, nothing in the change was wrong and no review rule can fix it. Report it separately from the rounds that drifted.

## Read the shape

- **Many rounds on a small diff** — the loop is not converging. Put `reviews` against `additions`: a dozen reviews on under a hundred lines is a ratchet, not a thorough review.
- **A fix that writes new text** — a finding in round N+1 on a line a round-N fix added is the ratchet itself: the reviewer audits the repair as if it were new work.
- **A large diff under one title** — versions folded in by rebase or a stack. Compare what the body claims with `changedFiles` and the file list.
- **A blocker on a file the diff never touched** — the author cannot apply it, so it is a demand, and the reviewer is writing the change.
- **Two pull requests for one decision** — the decision was re-litigated inside review. Read the closed one: work closed because the record under it was rewritten is the "built the opposite" signal.
- **A long settled-this-round paragraph every round** — the report is carrying a run log, which costs a wake and changes nothing.

## Conclude

- Count the findings that defend the item's stated contract, not the findings that are true. Accurate and necessary are different tests, and only the second one converges.
- Price each round: reviews x files touched. That number, not the tone of any single review, is the cost.
- Before proposing a rule change, check published practice for the same failure — Google's eng-practices review guide, Conventional Comments' blocking/non-blocking split, blame-aware review scoping, the two-round cap argued in agent-review postmortems. A rule that both the local data and the outside practice support is the one to write; a rule from either alone is a guess.
- The fix belongs in the rule that governs the step, not in a restatement of the complaint.
- **Make the rule a gate, not a virtue.** "Build the smallest thing" and "do not widen scope" were already written down and still failed, because neither can be inspected at the moment a finding is made. A rule bites when one occurrence answers yes or no without judgement — every finding names the line it defends; a round after the first opens no new subject; a fix corrects what the change put there. If a proposed rule cannot be checked against a single pull request, it is a restatement of the complaint, and the behaviour will not change.
