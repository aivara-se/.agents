# Durable & Background Systems

Four systems run alongside the main conversation loop. Developer notes: `AGENTS.md`.

### Delegation (`delegate_task`)

Spawn a subagent with an isolated context and terminal session.

- **Single** `delegate_task(goal, context)`; **batch** `tasks=[{goal, ...}]` runs in parallel, capped by `delegation.max_concurrent_children` (default 3).
- **Background** `background=true` returns a handle and keeps the parent loop going; the child's result re-enters as a new turn.
- **Roles:** `leaf` (default, cannot re-delegate) or `orchestrator` (spawns workers, bounded by `delegation.max_spawn_depth`).
- **Not durable:** a backgrounded child is process-local — if the parent exits, the child is lost. For work that must outlive it, use `cronjob` or `terminal(background=True, notify_on_complete=True)`.

### Cron (scheduled jobs)

Durable scheduler (`cron/jobs.py`, `cron/scheduler.py`), driven by the `cronjob` tool, `hermes cron` (`list`, `add`, `edit`, `pause`, `run`, `remove`) or `/cron`.

- **Schedules:** `"30m"`, `"every monday 9am"`, 5-field cron, or an ISO timestamp.
- **Per-job knobs:** `skills`, `model`/`provider`, `script` (pre-run data collection; `no_agent=True` makes the script the whole job), `context_from` (chain job A's output into job B), `workdir` (with its `AGENTS.md` / `CLAUDE.md` loaded), multi-platform delivery.
- **Invariants:** 3-minute hard interrupt per run; `.tick.lock` prevents duplicate ticks across processes; cron sessions pass `skip_memory=True`; deliveries carry a header/footer instead of being mirrored into the gateway session, which keeps role alternation intact.
- **`cronjob(action='list')` returns only `prompt_preview`** — a few dozen characters. Never answer "what does this job do?" from it: `session_search` the preview's first sentence, or read `$HERMES_HOME/profiles/<profile>/cron/output/<job_id>/<timestamp>.md`, which holds the prompt and the report that run delivered. Cron sessions carry `source: cron` and the job title.
- **A job writes what its prompt names.** Grep the prompt for the path before promising that it also updates a site, dashboard or index — a hand-maintained mirror elsewhere is why the public artifact lags the source.
- **A job publishing into a review-gated repo cannot merge.** Give it the branch, the PR, the reviewers and an explicit never-to-merge; have it look for its own open PR touching the same file and append to that branch, or every run stacks a conflicting PR.
- **Adding a step to a prompt is a rewrite.** `update` replaces the prompt whole and `list` will not show it; resend the full text, renumber the steps, keep the reply last — the run's final message is what gets delivered.

Docs: https://hermes-agent.nousresearch.com/docs/user-guide/features/cron

### Curator (skill lifecycle)

Tracks usage, marks idle agent-created skills stale, archives them, and keeps a pre-run tar.gz backup.

- **CLI:** `hermes curator <verb>` — `status`, `usage`, `run`, `pause`, `pin`, `archive`, `backup`, `rollback`; `--help` lists the rest. `/curator` mirrors it.
- **Scope:** only skills with `created_by: "agent"` provenance; bundled and hub-installed skills are off-limits. **Never deletes** — archive is the limit. Pinned skills skip every auto-transition and every LLM review pass.
- **Cost:** the deterministic inactivity/prune sweep is free; the aux-model "consolidate overlapping skills" pass is **off by default** (`curator.consolidate: true` or `hermes curator run --consolidate`).
- **Telemetry:** `~/.hermes/skills/.usage.json` — `use_count`, `view_count`, `patch_count`, `last_activity_at`, `state`, `pinned`.

Config: `curator.*` (`enabled`, `interval_hours`, `min_idle_hours`, `stale_after_days`, `archive_after_days`, `backup.*`). Docs: https://hermes-agent.nousresearch.com/docs/user-guide/features/curator

### Kanban (multi-agent work queue)

Durable SQLite board for multi-profile / multi-worker collaboration, driven with `hermes kanban <verb>`. Dispatched workers see a `kanban_*` toolset gated by `HERMES_KANBAN_TASK`; other sessions have no `kanban_*` schema unless configured.

- **CLI verbs:** `init`, `create`, `list`, `show`, `assign`, `link`, `comment`, `complete`, `block`, `unblock`, `archive`, `tail`; `--help` lists the rest.
- **Worker toolset:** `kanban_show`, `kanban_complete`, `kanban_block`, `kanban_heartbeat`, `kanban_comment`, `kanban_create`, `kanban_link`. Profiles enabling the `kanban` toolset outside a dispatched task also get `kanban_list` and `kanban_unblock`.
- **Dispatcher** runs inside the gateway by default (`kanban.dispatch_in_gateway: true`): reclaims stale claims, promotes ready tasks, claims atomically, spawns assigned profiles, and auto-blocks after `failure_limit` consecutive spawn failures (default 2; per-task `max_retries` overrides).
- **Isolation:** the board is the hard boundary (`HERMES_KANBAN_BOARD` pinned in env); a tenant is a soft namespace within a board, for workspace paths and memory keys.

Docs: https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban
