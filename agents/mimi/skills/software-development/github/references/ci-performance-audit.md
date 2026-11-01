# CI performance audit

How to answer "how are the workflows doing, where does the time go, what do we fix" with numbers from the API, not estimates. The deliverable is a ranked list of fixes, each with the minutes it saves.

## Procedure

1. **Enumerate every workflow, including the ones with no file.**

   ```bash
   for r in repo1 repo2; do
     gh api "repos/$org/$r/actions/workflows" \
       --jq '.workflows[] | "\(.id)\t\(.name)\t\(.path)\t\(.state)"'
   done
   ```

   A workflow whose file is gone stays registered and keeps its runs. Compare the list against `contents/.github/workflows` and check the last run date before you attribute any cost to it.

2. **Collect runs, then compute both clocks.** `per_page=50` per workflow is enough and fast.

   ```bash
   gh api "repos/$org/$r/actions/workflows/$wf/runs?per_page=50" \
     | jq -c --arg r "$r" '.workflow_runs[] | {repo:$r, wf:.name, run:.run_number, id:.id, event, concl:.conclusion, created:.created_at, started:.run_started_at, updated:.updated_at}'
   ```
   - duration = `updated_at - run_started_at`
   - queue = `run_started_at - created_at`
   - Drop `event == "dynamic"`: those are CodeQL and Dependency Graph internal runs, they repeat workflow names as `PR #123` or `Push on main`, and their durations are not yours to fix.

3. **Fetch jobs for every non-dynamic run in parallel.** Steps carry their own `started_at` and `completed_at`; job `created_at` gives the queue.

   ```bash
   jq -r '.[] | select(.event!="dynamic") | "\(.repo) \(.id)"' runs.json \
     | sort -u | xargs -P 10 -n 2 sh -c 'gh api "repos/ORG/$0/actions/runs/$1/jobs?per_page=100" > jobs/$1.json'
   ```

   About 380 runs take under 30 seconds at `-P 10`.

4. **Weight the minutes by runner.** `labels[0]` on the job names the runner: macOS bills 10x, Windows 2x, ubuntu 1x. Report raw minutes and weighted minutes side by side, or a 11-second macOS job looks harmless and is not.

5. **Rank by weighted minutes per repo, then by step inside the top job.** A job is a sum of its steps; the finding is the one step that owns the median.

6. **Explain the tail separately from the median.** A run at 2841 s with 6 s of steps is a queue, not slow work. Print the job queue's p95 and max, not only the steps.

7. **Map a run to its pull request before recommending a path filter.** `.pull_requests` in the runs payload is often empty. Take `.head_branch` from `actions/runs/{id}` and match it against `pulls?state=all`:

   ```bash
   gh api "repos/$org/$r/actions/runs/$id" --jq '.head_branch'
   gh api "repos/$org/$r/pulls/$n/files?per_page=100" --jq '.[].filename'
   ```

   Then count how many pull request runs touched nothing that the expensive job builds. That count is the argument for the filter.

8. **Check the required checks before proposing a conditional job.** A skipped required check leaves a pull request unmergeable forever.

   ```bash
   for id in $(gh api "repos/$org/$r/rulesets" --jq '.[].id'); do
     gh api "repos/$org/$r/rulesets/$id" \
       --jq '"\(.name): " + ([.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[].context] | join(", "))'
   done
   ```

   No required check on that repository means an `if:` on the job is safe.

9. **Look for the three repeat costs, in this order:** an expensive runner in a matrix that most changes do not need; a toolchain install repeated on every run (a `curl | sh`, an `apt-get update`); and the same workflow running on the pull request and again on the push to main when the merge method is rebase, which puts the identical tree on the branch.

10. **Bursts, not counts, size a concurrency fix.** Count pushes to main that land within 30 minutes of the previous push. Several are normal; a missing `concurrency:` group turns them into a deploy queue.

## Pitfalls

- `gh api` has no `-c` flag; `--jq` prints pretty JSON. Pipe to `jq -c` when you append JSON lines.
- `jq 'select(.event!="dynamic")'` on a top-level array silently fails; write `.[] | select(...)`.
- The run list is capped by `per_page`. Write "the last 50 runs of each workflow" in the report, never "all history".
- A zero-second job is usually a skipped conditional (`if:` on a version change), not a fast one. Read the workflow before calling it cheap.
- Attribute cost to the runner label, not the workflow name: `publish` can have a 5 s ubuntu job and a 10 s macOS job in the same run.

## Report shape

The chat message carries the verdict, the weighted total and the top three fixes, in the 150-word budget; `writing` owns that limit. The detail goes to a file: totals per repository, a job table with p50/p95/max, the step that owns each median, then the ranked fixes. Each fix states the measured basis and the minutes saved. Close with what you did not measure, so nobody reads an estimate as a measurement.
