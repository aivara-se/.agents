# Decision records

An ADR keeps its own history. Context sets out the forces, Decision picks one, and Consequences say what it costs.

## The record

- It stands alone: no links to a living document or to code. A clause of a living document that the decision retires is quoted by its own words in Consequences.
- It cites only earlier ADRs. A record written later did not exist when the decision was made.
- **Name the property, not a brand.** Keep the measured tool and its numbers in Context, and state the requirement in Decision. A vendor named as the decision becomes a clause the next install overrides.
- **State what the code must hold, not how the current layout works.** "The row changes no entry's height" is checkable. "The row sits in space the entry already leaves" is a guess the next change falsifies.
- **Editable while it is in review.** A record in an open pull request is rewritten in place, even when the decision moves; the body names who asked.
- It is immutable once accepted. A change overrides it with a new ADR naming the clauses it replaces. Only the operator can sanction an edit in place.
- **A record the tree never implemented is overridden the same way, and the new one says the older never ran.** Without that clause a reader takes the fallen sentences for the contract in force.
- Its overrides clause is a deletion list: the clauses it names stop, and everything else stands.
- One decision per record.

## Landing it

- Put it in the repository's ADR directory (`docs/adrs` in the app repositories), next number, slug from the decision. Read the ADR it extends or overrides first.
- The pull request carries the record and its roadmap line, never the code it justifies. Cut the branch from `main`, not from the branch holding the prototype it judged. Several records for one version go in one PR.
- Number a batch in dependency order, not request order. A record cites only lower numbers.
- Keep it short: 20–40 lines. Context is the forces and the numbers that decided it. Decision is one decision, in bullets when it has parts, as the repository's records write them. Consequences are the costs, including the one that stays. A draft past 40 lines is usually mechanism: move the tool and its measurements to Context.
- Cite measurements, not adjectives. "114.8 MB against 8.2 MB" decides; "much larger" does not.
- Say which earlier ADR still stands, or name the clauses this one replaces.
- Name no version in the record. The product document's roadmap maps the ADR to the version it ships in.
