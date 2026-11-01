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
- A `SKILL.md` is 900 words, a reference 750, an agent file 280.
- One rule per bullet, 30 words or less. The reason is a clause; the story goes in the commit.

## Shape

- The first line is the answer, the verdict or the ask. No preamble, no recap of the request.
- Then the evidence, then what you need.
- Use a list for a lookup and a paragraph for an argument.
- Be concrete: a path, a command, an example.

## Simplified Technical English

Prose follows the writing rules of ASD-STE100: we keep the rules, not its 900-word dictionary.

- An instruction is 20 words or less, a description 25.
- One instruction per sentence, in the imperative, present tense.
- Active voice with the actor named: "The job writes the row", not "the row is written".
- One term for one item, every time. Choose the short word: start, not initiate.
- Three words at most in a noun cluster: "the limit for pull request size".
- One idea per paragraph, six sentences at most. Never hard-wrap.
- Explain a specialist term on first use.
- No idiom, metaphor, joke or rhetorical question.
- No contraction, `i.e.` or `e.g.`: write "do not", "that is", "for example".
- The rules bind prose only: code, identifiers, paths, commands and quoted output keep their form.
- Two registers are exempt: the public blog and the site copy keep their own voice.
- `references/writing-ste.md` holds the numbers, the rewrites and the exemptions.

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

- `references/writing-ste.md` — the controlled language every sentence here obeys.
- `references/writing-messages.md` — chat, issue and pull-request comments.
- `references/writing-reviews.md` — a review verdict.
- `references/writing-pull-requests.md` — the body of a pull request.
- `references/writing-skills.md` — a `SKILL.md` and its supporting files.
- `references/writing-readmes.md` — a README.
- `references/writing-adr.md` — a decision record.
- `references/writing-product-doc.md`, `references/writing-design-doc.md`, `references/writing-system-doc.md` — the specs.
- `templates/readme-template.md` — start here for a new README.

An ADR is the one document that keeps what it displaced.
