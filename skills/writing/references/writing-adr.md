# Decision records

An ADR keeps its own history: Context sets out the forces at play, Decision picks one, and Consequences say what it costs.

- It stands alone: no links to a living document — product, design, system, README — or to code. They move, and the link rots.
- It cites only earlier ADRs. A record written later did not exist when the decision was made.
- It is immutable once accepted. A change overrides it with a new ADR naming the clauses it replaces; only the operator can sanction an edit in place.
- Its overrides clause is a deletion list: the clauses it names stop, and everything else stands.
- One decision per record. A record holding five has five that cannot be reversed one at a time.
