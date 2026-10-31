# Maintenance

The daily pass runs `agents/root/scripts/maintenance.ts` and hands its log to the agent. The script does the deterministic work; the agent decides what the log leaves open.

## Stages

- **Host** — refresh package lists, count pending upgrades, clear temp files, cap the journal, drop stale rotated logs, report disk and memory.
- **Fleet** — archive state and identities, check containers, gateway, tunnel and dashboard, restart an idle container to clear orphans, watch swap and kernel OOM kills.
- **Sync** — harvest uncommitted skill and soul edits, rebase `next` onto `main`, merge souls, archive profile skills, push `next`. The live checkout must be on `next`; any other branch is refused.
- **Leaks** — report watch spins, orphaned sandbox processes, dead registry pids and overgrown logs.

Each stage reports `[ok]`, `[act]` (a change it made), `[WARN]` (a decision it will not take) or `[plan]` (what `--dry-run` would have done).

## Rules the script obeys

- A backup is written before anything is pruned, and a refused archive stops that profile's pass.
- Auto-fix only what is reversible: start a stopped container, restart one with no live turn, prune a dangling image, delete a cache.
- Never delete or consolidate agent data, sessions, skills, repos or credentials.
- Backups rotate: the newest eight per type are kept and the oldest dropped.
- Never restart the gateway, and never read an unreadable lease store as idle.
- Never push `main` and never merge `next`; the operator merges.

## What the agent decides

- Every `[WARN]`: fix it, or state what it costs to leave it, in one line.
- The package upgrade: run it only when no profile holds a live turn lease.
- A conflict the script left untouched: a rebase of `next`, or a soul whose two sides disagree.
- Skill content and prose: a rule naming a job, script, path or cadence that no longer exists.
- Anything destructive, irreversible or outside the host: the operator's call, with the cost.

## Running it by hand

```sh
bun run agents/root/scripts/maintenance.ts --dry-run     # plan every stage
bun run agents/root/scripts/maintenance.ts --only=leaks  # one stage
bun run agents/root/scripts/maintenance.ts --upgrade     # includes the gated upgrade
```

Tests sit beside it: `bun test agents/root/scripts/`. Paths come from the environment (`HERMES_HOME`, `HERMES_BACKUP_DIR`, `AGENTS_REPO`), so a rebuilt host maps its own layout without editing the script.
