# The issue a version carries

A version's work item is an issue in its repository, opened after the records merge and before a builder starts. The assignment is the wake: writing the assignee starts the run, so the issue must be complete and its records must already be on `main`.

## Shape

- Title `vN.NN: <the user-visible change>`, one line.
- Label `enhancement`; assign the builder (`--assignee thani-sh-meme`), not the designer.
- Sections in this order: **What to build** (the records' decision bullets, as instructions), **Build** (the plumbing the decision implies — the bundler setting, the workflow job, the file that moves), **Acceptance** (one testable line each, naming the hand checks, because no test draws a frame), **Out of scope** (the version bump belongs to the release; the neighbouring surfaces), **Size** (measured lines, bytes, call sites — a figure, never an adjective).
- Link each record by its `blob/main` URL. A design pull request still in review is not a source: the builder's read pass fetches `main` and finds nothing there.
- Read the issue back after `gh issue edit --body-file`. The acceptance list is what a reviewer grades the pull request against, and a line the builder cannot check comes back as a blocker comment instead of code.

## Before the assignment

`gh issue view <n> --json title,body,labels,assignees`: an unassigned issue is work nobody builds, and an assignee on an issue with a missing criterion starts a run that stops on a comment.
