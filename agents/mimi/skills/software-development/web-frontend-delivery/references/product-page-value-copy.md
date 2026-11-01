# A project page that argues value

Use when a project page must sell what the product is worth to a reader who will never open the repository.

## The argument, in order

1. **Hero — the claim.** A small rubric (the product's name), a headline in the reader's world, the front page's one-line summary, then the change in plain terms. One CTA.
2. **Facts — four numbers that argue.** A metric earns its place only by making the point: agents in the loop, hand-offs by hand, decisions made for them. One that documents a mechanism — rounds, events, record fields — does not.
3. **What changes — three benefit columns.** Each names a change in the reader's day and one sentence of how. Three columns above ~860px, one below.
4. **The idea — a split section.** Rubric above, the principle at the left, the paragraph at the right: why the mechanism is safe, not what it does.
5. **What it refuses — a ledger.** Six rows, the claim at the left of a ~320px column and the reason beside it, a hairline per row, stacking below ~720px. A refusal ("it never keeps a queue") is trust, which is value; drop any the reader cannot check.
6. **Why it matters — a split section.** Who it is for in one paragraph, with the closing CTA at the end of the right column. One CTA near the top and one at the close; both may point at the repository.

## Copy rules

- The page argues; it does not document. Mechanisms — event names, caps, budgets, record formats — belong in the product document.
- Keep the front page's summary verbatim: the home page prints the same sentence.
- Use the reader's nouns — "hand-off", "nudge" — not "delivery", "payload", "round".
- A guarantee beats a feature. No status, badge or benchmark the reader cannot check.

## Layout notes

- Use the site's tokens and type; no new colour, surface or box.
- A split section (rubric above, heading left at ~380px, content right) breaks prose without a card.
- A ledger row aligns claim and reason on one baseline; do not centre or box it.
- Check the facts strip as numbers: every value's `y` and every label's first-line `y` match across columns at both widths. `column-reverse` in a stretched grid item drops a one-line label's number.
- `text-wrap: pretty` removes one-word last lines without re-editing approved copy.

## Documents move with it

The product doc's page-mode sentence and the design doc's screen lines describe this page: rewrite them in the same change, or they describe a site that no longer ships.
