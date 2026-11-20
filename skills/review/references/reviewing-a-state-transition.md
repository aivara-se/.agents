# Reviewing a state transition

A change that ends a row in a new state claims an invariant: no reader will ever see the old state again. Check the claim at the record, not at the goroutine.

## Four questions for every write

1. Which state does it move from? Read the `WHERE`. A write keyed only on `id` overwrites whatever is there, including an end another path already wrote.
2. Who else writes this row, and which rows does the claim name beside it? List them: the runner's tail, a retry, a resume, an API call. Each one must name the state it expects, or it is a race with the others. A guard on the parent row does not guard the child row the same clause names. An interrupted task and the exit of its action are two rows in two tables.
3. What protects the new state after the writer dies? A cancelled context, an in-memory flag or a goroutine order protects nothing once the process restarts. The record is the only state, so the record holds the guard.
4. Do the rows move together? A child row and its parent row belong in one transaction. The child is written first, while the parent still holds the state the subquery reads.

## Reproduce it

Prove the missing guard with a throwaway test, not an argument:

- Put `zz_probe_test.go` in the same `_test` package and use the package's own helpers and fixtures.
- Do the write the change adds, then the write the other path would do next, then read the row back and log its state.
- Pass `context.Background()` where the process would hold a cancelled one, so the probe tests the guard rather than the timing.
- Run the package: `go test ./internal/<pkg> -run TestProbe -v`.
- Apply the guard the author proposes and rerun the probe. Read back every row the contract line names, not only the row the fix touched. A one-line guard that ends the task as `interrupted` still lets a sibling `FinishAction` write `exit=0`.
- Restore a mutated production file with `git checkout -- <path>` before the next mutation. A `cp` taken minutes earlier restores the wrong bytes, and the next probe then measures the copy, not the change.
- Delete the file, then `git status --porcelain` must be empty before you post.

## Judge the window

A probe with the protection removed proves a latent gap, not a live defect. Say which one it is:

- Live: the production path reaches the write with a live context and the old state still set.
- Latent: a cancel, a flag or an ordering already blocks the write today. Report it as a follow-up with the one-line fix, not as a revert.

Write the finding as what the record answers: after the end call the task reads `interrupted`, and one unconditional finish makes it `done`. Name the fix as a clause: `WHERE id = ? AND state IN (?, ?)`, the state being written and `running`.

A strict `state = 'running'` stalls a resume. A task that finished before a crash is finished again on restart, and that second write must land on a row that reads `done`. A resume test proves the second value is needed; an eye on the SQL does not.

## A row written to be replayed

Storing an event to apply later moves the work's input into a column. The row must carry every field the apply branches on, or the replay decides differently.

- List each branch in the apply and the column that feeds it. A close branches on `merged`, a review on the review's state, a start on the title and the link. A missing column turns a merged close into a rejected one, with a blocked label on a landed pull request.
- The tell is a stored type with fewer fields than the event it copies: compare them field by field before you read the SQL.
- Write the row before the acknowledgement. A row written after the work lets a failed apply vanish behind a clean stop.
- Make the apply repeatable: a crash before the applied mark runs it again, so each write names the state it expects.
- Dedupe on the row's existence, not on the applied mark, so a repeat waits behind its first copy.
