# System document

The system document is the one authoritative place for how the thing is served and checked. Behaviour is the product document's, pixels the design document's; this document does not restate them, and it does not open by naming them.

## What it holds, in the order a reader needs it

- Hosting: host, branch, folder; whether there is a build; whether there is a backend; how a deploy happens.
- The tree and the shell: the files that boot it and draw the first screen, and the rule that keeps the offline copy current.
- Each mechanism the behaviour depends on, stated as the requirement it must meet plus the fallback if it cannot — a voice, a storage layer or a cache.
- Offline: how it runs with the network off, and what invalidates the stored copy.
- Storage: what persists between sessions and what does not.
- Any platform step a product promise leans on — an install or full-screen step — and exactly what it does not cover.
- Checks: the commands, and which layer catches what. State the gate as the design fixes it; whether it has run yet is not this document's business.

## Rules

- Name the choices, not the stack. The language, the host and the serving shape earn a line, because replacing any of them is a decision someone pays for; a package, a version floor and a file layout do not — they are how a choice above is spelled, not a choice of their own.
- Write the design, not the status. What the system is and what it must do belongs here; whether it is built, deployed or checked yet belongs in the pull request or the card. "Nothing here is built yet" is not architecture.
- Do not open by announcing the set. The product document, the design document, the decision records and this one are the repository's pattern; no reader needs any of them to say so. A sentence naming another document earns its place only where a fact needs it, and an opening line that restates the headings below it says nothing.
- Every mechanism is stated with the requirement it must meet and its fallback; a product promise holds only while the mechanism can deliver it.
- Record a value the moment it is measured, in the section it belongs to, rather than leaving a placeholder.
- Write the platform step's true reach: it covers what it covers and nothing more. Say so here, so no other document over-promises.
