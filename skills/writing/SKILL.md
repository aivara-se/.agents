---
name: writing
description: How this organisation writes — the length every message and document gets, and the file that shapes each kind.
when-to-use: "Anything a person reads: a chat message, a pull-request body, a review, a document, or a skill."
---

# Writing

Good writing is short enough to finish, and it puts the answer first.

## Length

- A chat message, issue comment or pull-request body is 150 words. Longer is a document: write the file and link it.
- Draft to about 130 words. A first draft runs long, and trimming it costs rounds.
- Count the words with `wc -w <file>`. Do not estimate.
- A `SKILL.md` is 900 words, a reference 750, an agent file 260.
- One rule per bullet, 30 words or less. The reason is a clause; the story goes in the commit.

## Shape

- The first line is the answer, the verdict or the ask. No preamble, no recap of the request.
- Then the evidence, then what you need.
- Use a list for a lookup and a paragraph for an argument.
- Be concrete: a path, a command, an example.

## Plain language

- Short sentences, present tense, active voice. Use the imperative for steps.
- Choose the short word: use, not utilise; help, not assist; about, not approximately.
- One idea per paragraph. Never hard-wrap.
- Explain a specialist term on first use.

## Where a fact lives

- One fact, one home. The product, design and system documents each own their subject, and the others link to them.
- An ADR stands alone and cites only earlier ADRs.
- User behaviour is the product document. Serving and checks are the system document. Interface and visual choices are the design document.
- Describe the pattern, not one instance: a page one agent has gets a general clause.
- A code comment explains why. Delete a comment that repeats the line below it.
- When a change makes a document untrue, fix that document in the same change.
- Do not name the current release in prose. Put the version in the changelog.
- Quote an ADR's condition word for word.

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
