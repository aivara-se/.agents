# System document

The one authoritative place for how the thing is served and checked. Behaviour is the product document's and pixels the design document's. Do not restate them, or open by naming them.

## What it holds, in the order a reader needs it

- Hosting: host, branch, folder; whether there is a build or a backend; how a deploy happens.
- The tree and the shell: the files that boot it and draw the first screen, and the rule that keeps the offline copy current.
- Each mechanism the behaviour depends on, stated as the requirement it must meet plus the fallback if it cannot.
- Offline: how it runs with the network off, and what invalidates the stored copy.
- Storage: what persists between sessions and what does not.
- Any platform step a product promise leans on, and exactly what it does not cover.
- Checks: the commands, and which layer catches what.

## Rules

- Name the choices, not the stack. The language, the host and the serving shape earn a line, because replacing any of them is a decision someone pays for. A package, a version floor and a file layout do not.
- Write the design, not the status. Whether it is built or deployed belongs in the pull request or the card.
- Every mechanism is stated with the requirement it must meet and its fallback.
- Record a value the moment it is measured, in the section it belongs to.
- Write the platform step's true reach, so no other document over-promises.
