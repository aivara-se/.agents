# System document

The system document is the one authoritative place for how the thing is served and checked. Behaviour is the product document's, pixels the design document's; this document links to them and does not restate them.

## What it holds, in the order a reader needs it

- Hosting: host, branch, folder; whether there is a build; whether there is a backend; how a deploy happens.
- The tree and the shell: the files that boot it and draw the first screen, and the rule that keeps the offline copy current.
- Each mechanism the behaviour depends on, stated as the requirement it must meet plus the fallback if it cannot — a voice, a storage layer or a cache.
- Offline: how it runs with the network off, and what invalidates the stored copy.
- Storage: what persists between sessions and what does not.
- Any platform step a product promise leans on — an install or full-screen step — and exactly what it does not cover.
- Checks: the commands, and which layer catches what. Say when nothing is machine-checked yet.

## Rules

- Name the mechanism, not a stack list. The host, the serving shape and the one library that must be vendored belong here; "built with X, Y, Z" does not.
- Every mechanism is stated with the requirement it must meet and its fallback; a product promise holds only while the mechanism can deliver it.
- Record a value the moment it is measured, in the section it belongs to, rather than leaving a placeholder.
- Write the platform step's true reach: it covers what it covers and nothing more. Say so here, so no other document over-promises.
