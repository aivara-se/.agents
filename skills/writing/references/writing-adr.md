# Decision records

An ADR is the one document that keeps its history: Context states the forces and the premise in its own words, Decision picks one, and Consequences say what the pick costs.

- It stands alone: no links to `PRODUCT.md`, `DESIGN.md`, `SYSTEMS.md` or `README.md`. They move, and a decision that points at them rots.
- It cites only earlier ADRs. A record written later did not exist when the decision was made.
- It is immutable once accepted. A change overrides it with a new ADR naming the clauses it replaces; only the operator can sanction an edit in place.
- Its overrides clause is a deletion list: the clauses it names stop, and everything else stands.
- One decision per record. A record holding five has five that cannot be reversed one at a time.
