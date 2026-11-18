# A merge queue

A merge queue holds the merge method: the repository merges the head once its checks pass.

- `gh pr merge <n>` queues the head. A strategy flag is refused, and the refusal does not mean nothing happened.
- A queued head reports `autoMergeRequest: null`. Read `mergeQueueEntry {position state}` in GraphQL, or a queued pull request looks unarmed.
- `CLEAN` with a null `autoMergeRequest` is also a queued head that merges a minute later. Read the queue entry before you press.
- Test "approved but not armed" against the queue first. "Already merged" means the item is done and the thread gets nothing.
- Arm the final head: a later push can leave the arm inert while the head reads `CLEAN`.
- A required check that cannot load merges on nothing, armed or not. Name the missing file in the body, and arm once it lands.
