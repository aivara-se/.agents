# Reviews

A review is read by one person, who has to act on it. It is a report, not a critique.

## The report

The verdict on the first line: `approve`, `request changes` or `block`. Then the findings that block the merge, and nothing else — no summary of the diff, no praise, no run log.

Each finding is at most three lines:

- what is wrong, with the file and line;
- the evidence: the command, the input or the output;
- the smallest fix that settles it.

When nothing blocks it, the verdict and one line naming what you ran.

## Rules

- Only what the author must act on to land the change, and only what you reproduced.
- A nit, a style the formatter already enforces, and "worth doing later" are not findings.
- Name the head you read: a verdict is about that commit.
- Give the author something to check — a failing test, a command's output — not an opinion.
