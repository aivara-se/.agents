---
name: writing
description: Rules for the documentation that ships with the code — where a fact lives, how it is written, and the README every application and library needs.
when-to-use: Any change to markdown, a README, a doc comment, or anything a human will read in order to understand the code.
---

# Writing

Documentation is part of the change, not a follow-up task. A change that makes a document wrong has not finished until the document is right.

## Scope and tense

- A document is written for a reader working in this repository: what is here, how to use it, how to check it, what to do next.
- Leave out what that reader does not need. A path, a pointer or a link earns its place by being needed to act on what the document says; a sentence about another repository's business, or about the organisation's other work, is detail nobody asked for.
- Present state and future. Say what is true now and what is meant to happen next; what a thing replaced, what an earlier version did, or where it moved from belongs in the commit and the pull request. A decision record (an ADR) is the exception — keeping the decision and what it displaced is the point of it.

## Where a fact lives

- One fact, one home. A repository has one authoritative document per subject — architecture, product, design — and each of them is the only copy of what it says. Link to them; do not restate their content anywhere else, including here.
- User-facing behaviour belongs in the product document, technical design in the architecture document, interface and visual decisions in the design document. When a fact could live in two of them, it lives in one and the other links to it.
- Code comments explain **why**. A comment that restates the line beneath it is noise: delete the comment, or delete the line.
- If the change makes any document untrue — the repository map included — fix that document in the same change.

## How to write it

- No stack bloat: **never** list the technologies used ("built with X, Y, Z"). Describe what the thing is for and what it does, not what it is made of.
- **Never** hard-wrap: one paragraph, one bullet, one line — in every markdown file, this one included. The reader's viewer does the wrapping; a line break inside a sentence shows up in the diff and in the rendered page as an artefact.
- **Never** write a table wider than 80 characters. A table that scrolls sideways cannot be read in a terminal, a diff, or on a phone, and it costs a reader more than the columns save. Content that repeats — a slot and its meaning, a rule and its reason — is a list, one item per line, or sub-headings with a paragraph under each.
- Short paragraphs, present tense, imperative for instructions. No marketing adjectives, no "simply", no "just", no exclamation marks.
- Every command quoted in prose must be the command the repository actually runs; if they differ, the document is wrong.
- Concrete over abstract: a path, a command and an example beat a paragraph of principles. Delete any sentence that would survive unchanged in a different repository.

## READMEs

- Every application and every shared library in this repository has a `README.md` at its root.
- Start from `resources/readme-template.md`, next to this file, rather than from a blank page; fill it in and delete the guidance you did not use.
- A README answers, in this order: what this is, how to run it locally, how to use it, how to check it. It does not carry history: not where the code came from, not what it replaced, not how an earlier version behaved. That belongs in the commit and the pull request, and in a README it is padding that pushes the useful part further down. Nor does it describe a roadmap or an org chart.
