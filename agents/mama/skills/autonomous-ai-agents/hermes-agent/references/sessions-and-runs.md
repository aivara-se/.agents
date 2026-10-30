# Sessions, runs and addresses

For a program that spawns Hermes (`hermes … chat -q "…"`) and is later asked what it started: what can be labelled at spawn, what can be found, and what can be reached while it runs. Check `hermes chat --help` and `hermes sessions --help` before relying on a flag list; when the binary runs on a host you cannot reach, read those files at the version tag that host runs (`raw.githubusercontent.com/NousResearch/hermes-agent/<tag>/hermes_cli/_parser.py`) — `main` may be an upgrade ahead. The read below is `hermes_cli/_parser.py`, `cli_single_query.py`, `main.py`'s resume resolution, `gateway_session_store.py` and `active_sessions.py`.

## Label at spawn: `--source`, and a title if you create it

- The only identity set by `--source` is the tag; a one-shot run is stored with source `oneshot` by default, and `cli` is the interactive surface. A title can also be set at spawn, by `-c <name> --create-if-missing` (below).
- `--source` is validated against a fixed set at `session.create`, not stored as given: an unknown label fails the run with `4001 invalid_params` before its first turn. `tool` is the value defined for a third-party integration, and the pickers hide it — use it rather than inventing a name.
- `hermes sessions list --source <tag>` filters on it, and the prune/archive filters take the same key.
- There is no `--title` on `chat`: a title is generated after the first exchange by an auxiliary model, set with `/title` from inside, or assigned with `hermes sessions rename <id> "<title>"`. Titles are unique, ≤100 characters, and strip control, zero-width and RTL characters only — `/` and `#` survive, so `area/repo#12 flow` is a legal title.
- Human pickers (TUI, Desktop, dashboard) exclude a deny-list of sources that includes `oneshot` and `tool`. A new tag therefore *adds* the session to those lists instead of hiding it: tagging is a visibility decision, not just a filter.

## Find a run's session id

- A one-shot prints `session_id: <id>` at exit — on stderr in quiet mode, through the exit summary otherwise.
- `--pass-session-id` puts the id in the agent's system prompt, so the agent knows it and the spawner does not.
- Otherwise: `hermes sessions list --source <tag> --limit N`, `--workspace <needle>` to scope by repo.

## While it runs

- A one-shot claims a live-session lease: `runtime/active_sessions.json` under the profile's `$HERMES_HOME` carries pid, surface, session id and start time; `hermes status` reports the count and who holds the slots.
- A configured `max_concurrent_sessions` can *refuse* a run; the child then exits non-zero with a message on stderr. A spawner must treat "the child started" and "the run got a slot" as different facts, and the exit status is meaningful (`cli_single_query.py` exits with the turn's outcome).
- The lease is liveness, not a job handle: no queue, no stdout capture, no result.

## Chain a spawner's runs by derived title

A spawner that wakes one agent repeatedly on one object (a pull request, an issue, a branch) gets continuity from a title it derives itself, with no id stored anywhere:

```
hermes --profile p chat -q "<reason>" --source tool \
  -c "owner/repo#12" --create-if-missing
```

- `--create-if-missing` resolves the name or creates the titled session and proceeds — resolve-or-create in one process, so no check-then-act race and no mapping table to lose on a crash.
- A miss without the flag is loud and safe for programmatic callers: `-c <name>` exits 1 on stderr with "No session found matching…". Bare `-c` is the terminal's breadcrumb or the most-recent session, so it is unusable when one profile serves many objects.
- Creation is a gateway RPC (`gateway_session_store.create_titled_session` → `session.create`), not a local write. The CLI dials the profile's gateway and starts one if none is running (`gateway_connection.GatewayConnection.start` → `connect_gateway`), so the first run on an object pays that start; a dial timeout or a refused create returns nothing and the child exits 1. The TUI path writes its own row; the classic `chat` path does not.
- The created row is stamped `source=cli` whatever `--source` the run carries, and a later run does not rewrite it: `--source tool` hides the runs, but the session the spawner created surfaces in the operator's pickers as a CLI session and `sessions list --source <tag>` will not find it. Select these sessions by title, or by `--workspace`, never by source.
- A resumed session **keeps its model and launch flags** and picks up the profile's current toolsets, MCP, terminal settings and `max_turns`; any config difference starts a new prompt-cache prefix. A model upgrade therefore never reaches an old thread.
- Resume restores the session's recorded cwd. Pin it with `--in <dir>` (which implies no restore) or drop the restore with `--no-restore-cwd`, or a run wakes in whatever directory the last turn left behind.
- Compression makes a lineage: `-c "<title>"` lands on the newest variant, and past the threshold the carried "context" is a summary, not the transcript.
- Titles have provenance `derived < llm < user`; auto-titling never overwrites a higher authority, so a title set at creation sticks.
- The transcript keeps every old tool result. A resumed run re-sends stale file contents and command output, so instruct the agent to re-read the live state first; and anything hostile it read once is replayed on every later run.

## Continue, steer, stop

- **Continue:** `hermes -c "<title>"`, `-r <id|title>`, `--in <dir>`; a lineage variant (a compressed child) resolves to the most recent.
- **Steer:** no CLI verb reaches a running one-shot — a single turn has no inbox. Steering is a gateway feature (`/queue`, `/status`, `/stop`) for chat sessions, so a spawner that needs it must route the run through the gateway, not start a child.
- **Stop:** only the spawner's own `cmd.Process.Pid` (or the lease entry) gives a target, and a kill is a hard stop mid-write, not a message.

## The rule

A label buys filtering, never control. Before promising "cancel", "steer" or "stop" from a tag or a reason, find the mapping from that thing to a pid or session — a tag names a family, and every run in the family carries the same one.