# Maintenance

The daily pass runs `agents/root/scripts/maintenance/` (entry `index.ts`, deployed at `/usr/local/lib/maintenance/`) and hands its log to the agent. The script does the deterministic work; the agent decides what is left open.

## Stages

- **Host** — refresh package lists, count pending upgrades, clear temp files, cap the journal, drop stale rotated logs, report disk and memory.
- **Fleet** — archive state and identities, check containers, gateway, tunnel and dashboard, restart an idle container to clear orphans, watch swap and kernel OOM kills, read the shared provider balance.
- **Sync** — fetch, three-way merge the souls, then hand the agent one reviewable diff: the paths it must rewrite or commit verbatim. The script never commits, rebases or pushes. The agent does all four and refreshes the `next -> main` pull request. The checkout must be on `next`; any other branch is refused.
- **Leaks** — report watch spins, orphaned sandbox processes, dead registry pids and overgrown logs.
- **Upgrade** — only with `--upgrade`, and skipped while any profile holds a live turn lease: the dockerd restart would kill a live turn.

Each stage reports `[ok]`, `[act]` (a change it made), `[WARN]` (a decision it will not take) or `[plan]` (what `--dry-run` would have done).

## Rules the script obeys

- A backup is written before anything is pruned.
- Auto-fix only what is reversible: start a stopped container, restart one with no live turn, prune a dangling image, delete a cache.
- Never delete or consolidate agent data, sessions, skills, repos or credentials.
- Backups rotate: the newest eight per type are kept and the oldest dropped.
- A credential leaves the host only to the API it belongs to.
- Never restart the gateway, and never read an unreadable lease store as idle.
- Never commit, push `main` or merge `next`: the agent owns the rebase, commit, push and pull request, and the operator merges.

## What the agent decides

- Every `[WARN]`: fix it, or state what it costs to leave it.
- The package upgrade: run it only when no profile holds a live turn lease.
- The whole sync hand-off: rebase, resolve a conflict on both sides, rewrite the queue, commit, push under the lease, refresh the `next -> main` pull request.
- Skill content and prose: a rule naming a job, script, path or cadence that no longer exists.
- Anything destructive, irreversible or outside the host: the operator's call, with the cost.

## Running it by hand

```sh
bun run agents/root/scripts/maintenance/index.ts --dry-run     # plan every stage
bun run agents/root/scripts/maintenance/index.ts --only=leaks  # one stage
bun run agents/root/scripts/maintenance/index.ts --upgrade     # includes the gated upgrade
```

A step is one module under `maintenance/stages/`, listed in `maintenance/registry.ts`. Tests sit beside them: `bun test agents/root/scripts/`. Paths come from `HERMES_HOME`, `HERMES_BACKUP_DIR` and `AGENTS_REPO`, so a rebuilt host maps its own layout. A fresh clone lands on `main`, so run `git switch -c next` before the first pass.
