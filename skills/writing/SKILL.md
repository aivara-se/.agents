---
name: writing
description: How this organisation writes — the length every message and document gets, and the file that shapes each kind.
when-to-use: "Anything a person reads: a chat message, a pull-request body, a review, a document, or a skill."
---

# Writing

Good writing is short enough to finish, and it puts the answer first.

## Length

- A message, issue comment or pull-request body is 150 words.
- Longer is a document: write the file, attach it in chat as `MEDIA:/absolute/path` on its own line, and link it in a GitHub body.
- Draft to about 130 words. A first draft runs long, and trimming it costs rounds.
- Count the words with `wc -w <file>`. Do not estimate.
- A `SKILL.md` is 900 words, a reference 750, an agent file 280.
- A product or system document is budgeted too: a fixed heading set, a cap per section, a total that is their sum.
- The cap is a ceiling, not a target. A rule squeezed out of the document is invented at the point of use.
- A cap quoted in more than one place is swept in the same edit: the example message, every total.
- One rule per bullet, 30 words or less; a step in a document is 20. The reason is a clause; the story goes in the commit.

## Shape

- The first line is the answer, the verdict or the ask. No preamble, no recap of the request.
- Then the evidence, then what you need.
- Use a list for a lookup and a paragraph for an argument.
- Be concrete: a path, a command, an example.
- A template's headings are a closed set: none that describes the document itself, and none that splits one question across two headers.

## Titles

A title says what happened, in enough detail that the body can be skipped.

- Keep it under 10 words: a pull request, an issue, a log entry, a document.
- Name the component, the term or the number: `Dispatch`, `dedup`, `26 ms`.
- Start a change with its verb: "Reject a delivery with no repository field".
- State the outcome or the lesson: "Squash-merge cuts blame detail, not startup time".
- Never a formula that hides the subject: "Three that held", "A rule that ...", "The X that Y".
- Never a teaser that the body has to explain.

## Simplified Technical English

Prose follows the writing rules of ASD-STE100: we keep the rules, not its 900-word dictionary.

- An instruction in prose is 20 words or less, a description 25.
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
- A feature states its rules once. The product document owns what the person sees, the system document the mechanism, the ADR the decision and its cost.
- An ADR stands alone and cites only earlier ADRs.
- User behaviour is the product document. Serving and checks are the system document. Interface and visual choices are the design document.
- Describe the pattern, not one instance: a page one agent has gets a general clause.
- A code comment explains why. Delete a comment that repeats the line below it.
- When a change makes a document untrue, fix that document in the same change.
- Do not name the current release in prose. What shipped, and when, is the release record.
- Quote an ADR's condition word for word.

## Which document

- Read the matching reference before the first draft. The shape is cheaper to follow than to cut out.
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
