# A failed check

A red check is worked, not re-run. `dispatch`'s `SKILL.md` carries the rule; this file is the diagnosis.

- Read the failing job's log at the head, reproduce the failure there, fix it, push, and re-request. A check that passes on its second run is a broken test, never a fix.
- A check that never reports is not a red check. An empty `statusCheckRollup` means the workflow failed to load, usually a `uses:` absent at its pinned ref.
- The tell is a run named by its file path, with no log. Fix the file and re-run on the same head: a re-run keeps the approval.
- A workflow that fails on every branch, including `main`, is the repository's state: report the baseline, not a finding.
- A check that never starts on a push to a branch reads the workflow's `on:` list: a pull-request-only workflow wakes on no branch.
