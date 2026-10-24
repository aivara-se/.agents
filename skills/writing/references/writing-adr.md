# Decision records

An ADR is the one document that keeps its history: the decision, the reasons and the shape it fixes, including what it displaces.

- It stands alone. No links to the product, design, system or README documents: they move, and a decision that points at them rots. Links to other ADRs are fine.
- It is immutable once accepted. A change overrides it with a new ADR naming the clauses it replaces; only the operator can sanction an edit in place.
- Its overrides clause is a deletion list: the clauses it names stop, and everything else stands.
- One decision per record. A record holding five has five that cannot be reversed one at a time.
