# Pull requests

The body answers why this exists and how you know it works. The diff is the record of what changed; never restate it.

## The body

- The goal in one sentence: what the change delivers.
- How it was verified: the command and the tree it ran on.
- What was left out, and why — the gaps this version admits.
- The issue it closes: `Closes #29`, repeated for each.
- Anything the operator asked for that looks out of scope, named.

150 words. A reviewer reads the body before the diff, and a body longer than the diff it explains is a document.

## The title

Imperative and specific: "Reject a delivery with no repository field", not "Fix delivery bug". A prefix only where the repository has one, as in `blog:`.

## Never

- A list of changed files.
- A summary of your own process: what you tried, what you reverted.
- An apology, a promise, or "let me know if": the review is the answer.
