---
name: writing
description: How this organisation writes — the length every message and document gets, and the file that shapes each kind.
when-to-use: "Anything a person reads: a chat message, a pull-request body, a review, a document, or a skill."
---

# Writing

Two things decide whether writing works: it is short enough to finish, and the reader finds what they need first.

## Length

- A chat message, issue comment or pull-request body is 150 words. Past that it is a document: write it to a file and link it.
- Count it (`wc -w <file>`) instead of estimating: the limit is exact and an eye estimate runs long every time.
- A review is one screen: the verdict and the findings that block.
- A `SKILL.md` is 900 words, a reference 750, an agent file 260.
- One rule per bullet, 30 words or less. The reason is a clause; the story belongs to the commit.
- A section that can be one line is one line. Delete any sentence that would survive unchanged in another repository.

## Shape

- The first line is the answer, the verdict or the ask. Nothing before it: no preamble, no restating the request, no recap.
- Then the evidence, then what you need. Never the other way round.
- A list repeats; a paragraph argues. A lookup — who reviews what, which command for which case — is a list.
- Concrete beats abstract: a path, a command, an example.

## Plain language

- Short sentences, present tense, active voice. Imperative for instructions.
- The short word: use not utilise, help not assist, about not approximately. No "simply", no "just", no "note that".
- One idea per paragraph. Never hard-wrap. Never a table wider than 80 characters.
- Explain a specialist term on first use: a reader who knows it is not slowed, and one who does not is lost.

## Where a fact lives

- One fact, one home. A repository has one document per subject — product, design, system — and the others link to it.
- An ADR is the exception: it stands alone and cites only earlier ADRs.
- User-facing behaviour is the product document. Serving and checks are the system document. Interface and visual decisions are the design document.
- A shared document describes the pattern, not one instance: a page one agent has gets a generic clause, never the screen or mode.
- A code comment explains why. A comment that restates the line beneath it is noise: delete the comment, or the line.
- If the change makes a document untrue, fix that document in the same change.

## Which document

- `references/writing-messages.md` — chat, issue and pull-request comments.
- `references/writing-reviews.md` — a review verdict.
- `references/writing-pull-requests.md` — the body of a pull request.
- `references/writing-skills.md` — a `SKILL.md` and its supporting files.
- `references/writing-readmes.md` — a README.
- `references/writing-adr.md` — a decision record.
- `references/writing-product-doc.md`, `references/writing-design-doc.md`, `references/writing-system-doc.md` — the specs.
- `templates/readme-template.md` — start here for a new README.

An ADR is the one document that keeps what it displaced.
