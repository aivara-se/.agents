# Decision records

An ADR keeps its own history: Context sets out the forces at play, Decision picks one, and Consequences say what it costs.

## The record

- It stands alone: no links to a living document — product, design, system, README — or to code. They move, and the link rots. A clause of a living document that the decision retires is quoted by its own words in Consequences, never linked and never paraphrased; the quote is what a reader can match when the code lands.
- It cites only earlier ADRs. A record written later did not exist when the decision was made.
- **A Decision names the property, not a brand that can be swapped.** Keep the measured tool and its numbers in Context; state the requirement in Decision ("any agent that scrapes Prometheus text"). A vendor named as the decision becomes a clause the operator's next install overrides with no decision behind it.
- **A Decision states the property the code must hold, not a sentence about how the current layout happens to work.** "The row changes no entry's height" is a requirement a reviewer can check; "the row sits in space the entry already leaves" is a guess that the next layout change falsifies. When a control appears on focus, name the focus container, not the caret: a row keyed to the textarea's caret vanishes on the mousedown that would click its button.
- It is immutable once accepted. A change overrides it with a new ADR naming the clauses it replaces; only the operator can sanction an edit in place.
- **A record the tree never implemented is overridden the same way, and the new one says the older never ran.** Without that clause a reader takes the fallen sentences for the contract in force. No shipped behaviour changes, so the only living sentence that moves is the system document's *planned, not built* line.
- Its overrides clause is a deletion list: the clauses it names stop, and everything else stands.
- One decision per record. A record holding five has five that cannot be reversed one at a time.

## Landing it

- Put it in the repository's ADR directory (`docs/adrs` in the app repositories), next number, slug from the decision; read the ADR it extends or overrides first.
- The pull request carries the record and its roadmap line, never the code it justifies — cut the branch from `main`, not from the branch holding the prototype it judged. When the operator asks for several records at once, one PR carries all of them and their roadmap edits.
- A batch is numbered in dependency order, not request order: a record cites only lower numbers, so the decision that frees a slot or creates the surface another uses takes the lower number. The version's roadmap line links every record in that order.
- Keep it short: 20–40 lines. Context is the forces and the numbers that decided it, not the research; Decision is one paragraph; Consequences are the costs, including the one that stays.
- Cite measurements, not adjectives: "114.8 MB against 8.2 MB" decides; "much larger" does not.
- Say which earlier ADR still stands, or name the clauses this one replaces.
- Name no version in the record: the roadmap in the product document maps the ADR to the version it ships in. Two homes for that mapping is how they drift.
- A batch also moves the counts: the roadmap list, and the system document's "decided, not built" number. A count is a fact that goes stale silently.
