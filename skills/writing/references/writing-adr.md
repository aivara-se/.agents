# Decision records

An ADR keeps its own history: Context sets out the forces at play, Decision picks one, and Consequences say what it costs.

## The record

- It stands alone: no links to a living document — product, design, system, README — or to code. They move, and the link rots.
- It cites only earlier ADRs. A record written later did not exist when the decision was made.
- It is immutable once accepted. A change overrides it with a new ADR naming the clauses it replaces; only the operator can sanction an edit in place.
- Its overrides clause is a deletion list: the clauses it names stop, and everything else stands.
- One decision per record. A record holding five has five that cannot be reversed one at a time.

## Landing it

- Put it in the repository's ADR directory (`docs/adrs` in the app repositories), next number, slug from the decision; read the ADR it extends or overrides first.
- The pull request carries the record and nothing else — cut the branch from `main`, not from the branch holding the prototype it judged.
- Keep it short: 20–40 lines. Context is the forces and the numbers that decided it, not the research; Decision is one paragraph; Consequences are the costs, including the one that stays.
- Cite measurements, not adjectives: "114.8 MB against 8.2 MB" decides; "much larger" does not.
- Say which earlier ADR still stands, or name the clauses this one replaces.
