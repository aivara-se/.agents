# A project page that argues value

Use when a project page has to sell what the product is worth to a reader who will never open the
repository. It is the shape that survived an operator asking to remove implementation detail from a
page that had been written as a specification.

## The argument, in order

1. **Hero — the claim.** A small rubric (the product's name), a headline in the reader's world
   ("Work doesn't wait to be noticed."), the front page's one-line summary under it, then the change in
   plain terms ("Nobody forwards the request, and no agent sits waiting to be told."). One CTA.
2. **Facts — four numbers that argue.** A metric earns its place when it makes the point: agents kept
   in the loop, hand-offs by hand, decisions made for them, jobs the product has. If a number only
   documents a mechanism (rounds, events, record fields), it is not a fact for this page.
3. **What changes — three benefit columns.** Each one names a change in the reader's day and gives one
   sentence of how: work finds its owner, the exchange closes itself, nothing waits its turn. Three
   columns above ~860px, one below.
4. **The idea — a split section.** Rubric above, the principle at the left ("A nudge, not an order."),
   the paragraph at the right. It explains why the mechanism is safe, not what it does.
5. **What it refuses — a ledger.** Six rows, the claim at the left of a ~320px column and the reason
   beside it, a hairline per row, stacking below ~720px. A mechanism converts into a refusal cleanly:
   "it never keeps a queue" is trust, which is value. Drop any refusal the reader cannot check.
6. **Why it matters — a split section.** Who it is for, in one paragraph, with the closing CTA at the
   end of the right column. The page needs one CTA near the top and one at the close; both may point at
   the repository.

## Copy rules

- The page is an argument, not a manual. Event names, caps, budgets, queue internals and record formats
  belong in the product document; a fact stays only if it changes the reader's decision.
- Keep the front page's summary verbatim. It is one source of truth and the row on the home page prints
  the same sentence.
- Prefer the reader's nouns to the system's: "hand-off", "nudge", "the work waits", not "delivery",
  "payload", "round".
- A guarantee is stronger than a feature: what the product refuses to do reassures more than another
  thing it does.
- No status, badge, customer or benchmark the reader cannot check. The repository is the record.

## Layout notes

- Use the site's existing tokens and type; a value page does not need a new colour, surface or box.
- A split section (rubric above, heading left at ~380px, content right) breaks a stack of prose without
  adding a card.
- A ledger row aligns the claim and its reason on one baseline; do not centre or box it.
- Check the facts strip as numbers: every value's `y` and every label's first-line `y` must match across
  columns at the widest and narrowest widths. `column-reverse` in a stretched grid item is the usual
  cause when a one-line label drops its number.
- `text-wrap: pretty` on body copy removes one-word last lines without re-editing approved copy.

## Documents move with it

The product document's page-mode sentence and the design document's screen/layout lines describe this
page; rewrite them in the same change. "A name and one sentence" is no longer true of a page that
carries a headline, facts, four parts and a CTA, and a design doc that still promises a document of
mechanism will describe a site that no longer ships.
