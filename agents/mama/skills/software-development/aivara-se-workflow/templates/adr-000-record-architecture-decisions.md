# 000 - Record Architecture Decisions

<!-- Template for a repository that carries no `docs/adrs/`, and for `aivara-se/.template`.
Replace the Context paragraph with this repository's own shape; keep the Decision and
Consequences verbatim, so every repository states the same status rule. -->

## Context

{{What this repository is, and the choices behind it that are expensive to reverse. Say that a later reader must be able to find them, and that their status must not depend on anyone's memory.}}

## Decision

We record one significant architectural decision per file in `docs/adrs`, as Markdown. A decision is **Accepted** when its file is merged into `main`, and **In Review** while its pull request is open. An accepted record is not edited: a decision that contradicts it is a new record that names the clauses it overrides, and the old file stays as the account of what was believed then.

An ADR is written before the code that depends on it, and it says what the choice costs, not only what it buys.

## Consequences

- The why behind a choice is searchable and outlives the agent who made it.
- A reader can tell which decisions are live and which are history.
- A decision that inverts costs a new file rather than a rewrite, so the record keeps its history.
