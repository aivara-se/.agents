# Contributor Quick Reference

For occasional contributors and PR authors. Full developer docs: https://hermes-agent.nousresearch.com/docs/developer-guide/

### Project Layout

```
hermes-agent/
├── run_agent.py          # AIAgent — core conversation loop
├── model_tools.py        # Tool discovery and dispatch
├── toolsets.py           # Toolset definitions
├── cli.py                # Interactive CLI (HermesCLI)
├── hermes_state.py       # SQLite session store
├── agent/                # Prompt builder, compression, memory, model routing, credential pooling
├── hermes_cli/           # CLI subcommands, config, setup
│   ├── commands.py       # Slash command registry (CommandDef)
│   ├── config.py         # DEFAULT_CONFIG, env var definitions
│   └── main.py           # CLI entry point and argparse
├── tools/                # One file per tool
│   └── registry.py       # Central tool registry
├── gateway/              # Messaging gateway
│   └── platforms/        # Platform adapters (telegram, discord, etc.)
├── cron/                 # Job scheduler
├── tests/                # pytest suite (run via scripts/run_tests.sh)
└── website/              # Docusaurus docs site
```

Config: `~/.hermes/config.yaml` (settings), `~/.hermes/.env` (API keys) — both under `$HERMES_HOME` when it is set.

### Adding a Tool

Two files. Auto-discovery imports any `tools/*.py` with a top-level `registry.register()` call, but a tool is only _exposed_ once its name appears in a toolset.

**1. Create `tools/your_tool.py`** — handlers return JSON strings, and `check_fn` keeps the tool hidden until its requirements are met:

```python
import json, os
from tools.registry import registry

def check_requirements() -> bool:
    return bool(os.getenv("EXAMPLE_API_KEY"))

def example_tool(param: str, task_id: str = None) -> str:
    return json.dumps({"success": True, "data": "..."})

registry.register(
    name="example_tool",
    toolset="example",
    schema={"name": "example_tool", "description": "...", "parameters": {...}},
    handler=lambda args, **kw: example_tool(
        param=args.get("param", ""), task_id=kw.get("task_id")),
    check_fn=check_requirements,
    requires_env=["EXAMPLE_API_KEY"],
)
```

**2. Wire it into a toolset in `toolsets.py`** — add the name to `_HERMES_CORE_TOOLS` (every platform) or to a specific toolset.

Use `get_hermes_home()` for paths. For a custom or local-only tool, write a plugin in `~/.hermes/plugins/` instead of editing core — see the developer docs.

### Adding a Slash Command

1. Add `CommandDef` to `COMMAND_REGISTRY` in `hermes_cli/commands.py`
2. Add a handler in `cli.py` → `process_command()`
3. (Optional) Add a gateway handler in `gateway/run.py`

Help text, autocomplete, the Telegram menu and the Slack mapping all derive from the central registry.

### Testing

Use `scripts/run_tests.sh` for CI parity. It clears credentials, sets `TZ=UTC`, and runs each test file in a separate subprocess through `scripts/run_tests_parallel.py`. It does not use xdist.

```bash
scripts/run_tests.sh                          # full suite
scripts/run_tests.sh tests/tools/             # one directory
scripts/run_tests.sh tests/tools/test_x.py    # one file
scripts/run_tests.sh -v --tb=long             # pass-through pytest flags
```

- Tests redirect `HERMES_HOME` to a temp dir — they never touch the real `~/.hermes/`.
- Build a test environment through PM, not pip or uv: `python -m pm.build_env --source . --out .venv --group dev --group test`. The output must not exist; stop its processes and remove only that disposable environment before regenerating.
- The runner probes `.venv`, `venv` and the source-install venv before falling back to `HERMES_PYTHON`; each candidate must contain pytest.
- After editing `pyproject.toml`, run `hermes pm lock`, re-source `./activate`, and commit `pyproject.toml` with `uv.lock`.
- **Windows:** run the same wrapper through Git Bash. See `references/windows-quirks.md`.

Host-specific tests run on the real host, one `@pytest.mark.platforms(...)` marker per test (e.g. `@pytest.mark.platforms("windows", arch="arm64")`). Do not fake the host by patching `sys.platform` or platform probes.

### System prompt's execution-environment block

`agent/prompt_builder.py::build_environment_hints()` emits the host guidance (OS, `$HOME`, cwd, terminal backend, shell). With a **remote** backend (`docker, singularity, modal, daytona, ssh, managed_modal`) host info is suppressed and _every_ file tool runs inside the container — never let the prompt describe a host the agent cannot touch.

### Commit Conventions

`type: concise subject line`, then an optional body. Types: `fix:`, `feat:`, `refactor:`, `docs:`, `chore:`

The hard invariants (prompt caching, role alternation, `get_hermes_home()`, config-vs-secrets) live in `SKILL.md` and apply here unchanged.
