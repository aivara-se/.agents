# Reviews

How a review reads. What to look for is the `review` skill's; this file is the words.

A review is read by one person, who has to act on it. It is a report, not a critique.

## The report

The verdict on the first line: `approve`, `request changes` or `block`. Then the findings that block the merge — each one you reproduced — and nothing else: no summary of the diff, no praise, no run log.

Each finding is at most three lines:

- what is wrong, where, and the contract line it defends;
- the evidence: the command, the input or the output;
- the smallest fix that settles it.

When nothing blocks it, the verdict and one line naming what you ran.

## Rules

- A nit, a style the formatter already enforces, and "worth doing later" are not findings.
- Name the head you read: a verdict is about that commit.
- Give the author something to check — a failing test, a command's output — not an opinion.
