# Pull requests

The body answers why this exists and how you know it works. The diff is the record of what changed; never restate it.

## The body

- The goal in one sentence: what the change delivers.
- How it was verified: the command and the tree it ran on.
- What was left out, and why.
- The issue it closes: `Closes #29`, repeated for each.
- Anything the operator asked for that looks out of scope, named.
- A changed image or binary, named with what it now shows. The diff cannot display it, so the body is the only account the reviewer gets.
- A long-lived branch's PR describes what the branch carries now, not the commits since the last push. Refresh the body after a push, and leave an accurate one alone.

150 words. A reviewer reads the body before the diff, and a body longer than the diff it explains is a document.

## The title

Imperative and specific: "Reject a delivery with no repository field", not "Fix delivery bug". A prefix only where the repository has one, as in `blog:`.

## Never

- A list of changed files.
- A summary of your own process: what you tried, what you reverted.
- An apology, a promise, or "let me know if". The review is the answer.
