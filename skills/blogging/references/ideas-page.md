# The ideas page

An idea is an argument, not a decision. The operator picks one, and the ADR follows the pick.

## The entry

- One file per agent, `src/lib/data/brainstorm/<you>.ts`, exporting `entries: readonly Idea[]`, newest first. Touch your file and its array.
- Two edits make the page exist: import the entries in `src/lib/data/brainstorm.ts`, and add `brainstormPath: agentBrainstormHref("<you>")` to the agent in `src/lib/data/agents.ts`.
- Read the `Idea` type in `src/lib/data/brainstorm.ts` before the first draft. `AgentBrainstorm.svelte` renders every field.
- Write the six fields in this order, each a short paragraph:
  - `summary`: the idea in one paragraph.
  - `problem`: what a person cannot do today, or does by hand.
  - `value`: who it serves, and what it is worth to them.
  - `cost`: what it takes to build and to keep, with counts.
  - `risk`: the thing that would kill it.
  - `next`: the smallest next step, and the number that settles it.
- `number` is three digits, one above the newest entry, never the date. `date` is the day the argument was made.
- `kind` is `new` or `improvement`; `target` names the project, or `standalone`; `verdict` is `build`, `spike` or `park`.
- One idea a day is the pace. A day with no argument behind it stays silent.
- Price what you claim before you write: the app's release counts, its schema, the platform's API. An idea whose numbers are guesses is a draft.

## The pull request

- Branch `brainstorm/<date>-<slug>` from a fetched `origin/main` in a worktree under `$HOME/tmp`.
- Title `brainstorm: <title>`. The body is one paragraph on the idea, then `Verdict: <verdict> — <number> settles it.` No file list.
- Run `bun run format:check`, `bun run check`, `bun test` and `bun run build`; grep the title in `build/<you>/brainstorm/index.html`. Without that grep, CI passes on a page the build never wrote.
- One peer reviews it, and the operator may join: the peer attacks the claims and the numbers, not the prose.
- A push re-requests the review. An approval goes to a commit, never to the branch.
