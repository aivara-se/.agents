# Pull requests

The body answers why this exists and how you know it works. The diff is the record of what changed; never restate it.

## The body

- The goal in one sentence: what the change delivers.
- How it was verified: the command and the tree it ran on.
- What was left out, and why.
- The issue it closes: `Closes #29`, repeated for each.
- Anything the operator asked for that looks out of scope, named.
- A changed image or binary, named with what it now shows. The diff cannot display it, so the body is the only account the reviewer gets.
- A change a person sees — a page, a window, a rendered document, a command's output — carries a screenshot in the body.
- The shot is of the built head, never of a mock or a design file.
- Embed it from the commit: a path on your disk is invisible to the reviewer. `![Checkout, error state, 1440px wide](https://github.com/<owner>/<repo>/blob/<sha>/docs/screenshot.png?raw=true)`
- Update the file the repository keeps for this, such as `docs/screenshot.png`.
- A repository that keeps none gains one beside the document that shows the product.
- A surface the base commit already shows gets two shots: that file at the base commit, then at the head.
- The alt text names the screen, the state and the width. An uncaptioned shot is a guess.
- No shot where the screen does not change: a refactor, a test, a document's wording.
- A long-lived branch's PR describes what the branch carries now, not the commits since the last push. Refresh the body after a push, and leave an accurate one alone.

150 words. A reviewer reads the body before the diff, and a body longer than the diff it explains is a document.

## The title

`writing`'s title rule governs it. A prefix only where the repository has one, as in `blog:`.

## Never

- A list of changed files.
- A summary of your own process: what you tried, what you reverted.
- An apology, a promise, or "let me know if". The review is the answer.
