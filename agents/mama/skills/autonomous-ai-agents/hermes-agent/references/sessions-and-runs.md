# Sessions, runs and addresses

You spawn `hermes … chat -q "…"` and are later asked what you started. This covers what you can label, find and reach. Check `hermes chat --help` and `hermes sessions --help` first; if the binary runs on a host you cannot reach, read `hermes_cli/_parser.py` at the tag that host runs. Rules below come from `hermes_cli/_parser.py`, `cli_single_query.py`, `main.py`'s resume resolution, `gateway_session_store.py` and `active_sessions.py`.

## Label at spawn

- `--source <tag>` sets only the tag. A one-shot stores `oneshot`; the interactive surface stores `cli`.
- The tag is **validated against a fixed set** at `session.create`, not stored as given. An unknown label fails the run with `4001 invalid_params` before the first turn. Use `tool` for a third-party integration; the pickers hide it.
- **There is no `--title` on `chat`.** Set one with `hermes sessions rename <id> "<title>"`, with `/title` inside, or at spawn with `-c <name> --create-if-missing`. Titles are unique, ≤100 characters, and strip only control, zero-width and RTL characters — `/` and `#` survive, so `area/repo#12 flow` is legal.
- Human pickers exclude a deny-list of sources that includes `oneshot` and `tool`. A new tag therefore **adds** the session to those lists instead of hiding it: tagging is a visibility decision, not only a filter.

## Find the id

A one-shot prints `session_id: <id>` at exit — on stderr in quiet mode. `--pass-session-id` puts it in the agent's system prompt instead, so the agent knows it and the spawner does not. Otherwise: `hermes sessions list --source <tag> --limit N`, or `--workspace <needle>` to scope by repo.

## While it runs

- A one-shot claims a live-session lease: `runtime/active_sessions.json` under the profile's `$HERMES_HOME` holds pid, surface, session id and start time.
- A configured `max_concurrent_sessions` can _refuse_ a run; the child then exits non-zero with a stderr message. "The child started" and "the run got a slot" are different facts.
- The lease is liveness, not a job handle: no queue, no stdout capture, no result.

## Chain runs by derived title

A spawner that wakes one agent repeatedly on one object (a pull request, an issue, a branch) gets continuity from a title it derives itself, with no id stored anywhere:

```
hermes --profile p chat -q "<reason>" --source tool \
  -c "owner/repo#12" --create-if-missing
```

- `--create-if-missing` resolves the name or creates the session and proceeds — resolve-or-create in one process, so no check-then-act race and no mapping table to lose on a crash. Without the flag, `-c <name>` exits 1 with "No session found matching…", which is loud and safe for a programmatic caller. Bare `-c` means the most recent session, so it is unusable when one profile serves many objects.
- Creation is a gateway RPC (`gateway_session_store.create_titled_session` → `session.create`), not a local write. The CLI dials the profile's gateway and starts one if none runs, so the first run on an object pays that start; a dial timeout or a refused create returns nothing and the child exits 1. The TUI path writes its own row; the classic `chat` path does not.
- The created row is **stamped `source=cli` whatever `--source` the run carries**, and no later run rewrites it: `--source tool` hides the runs, but the created session still surfaces in the operator's pickers and `sessions list --source <tag>` will not find it. Select these by title or `--workspace`, never by source.
- A resumed session **keeps its model and launch flags** and picks up the profile's current toolsets, MCP, terminal settings and `max_turns`; any config difference starts a new prompt-cache prefix. A model upgrade never reaches an old thread.
- Resume restores the recorded cwd. Pin it with `--in <dir>` (which implies no restore) or use `--no-restore-cwd`, or the run wakes in whatever directory the last turn left behind.
- Compression makes a lineage: `-c "<title>"` lands on the newest variant, and past the threshold the carried context is a summary, not the transcript.
- Titles have provenance `derived < llm < user`; auto-titling never overwrites a higher authority, so a title set at creation sticks.
- The transcript keeps every old tool result, so a resumed run re-sends stale file contents and command output: tell the agent to re-read live state first. Anything hostile it read once is replayed on every later run.

## Continue, steer, stop

- **Continue:** `hermes -c "<title>"`, `-r <id|title>`, `--in <dir>`.
- **Steer:** no CLI verb reaches a running one-shot — a single turn has no inbox. `/queue`, `/status` and `/stop` are gateway features, so a spawner that needs steering must route the run through the gateway.
- **Stop:** only the spawner's own process pid (or the lease entry) gives a target, and a kill is a hard stop mid-write, not a message.

## The rule

A label buys filtering, never control. Before promising "cancel", "steer" or "stop" from a tag or a reason, find the mapping from that thing to a pid or session — a tag names a family, and every run in the family carries the same one.
