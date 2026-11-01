---
name: hermes-agent
description: "Use, configure, theme, extend, and orchestrate Hermes Agent."
version: 3.2.0
author: Hermes Agent + Teknium
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags:
      [
        hermes,
        setup,
        configuration,
        multi-agent,
        spawning,
        cli,
        gateway,
        bots,
        bot-mode,
        features,
        themes,
        skins,
        desktop-plugins,
        tui-widgets,
        petdex,
        development,
      ]
    homepage: https://github.com/NousResearch/hermes-agent
    related_skills: [claude-code, codex, opencode]
---

# Hermes Agent

Hermes Agent is an open-source agent framework by Nous Research. It runs in a terminal, a desktop app, messaging platforms and IDEs. It works with any LLM provider, on Linux, macOS, Windows and WSL.

What sets it apart: it saves procedures as **skills** and reloads them; it keeps **memory** across sessions; one **gateway** serves Telegram, Discord, Slack, WhatsApp, Signal and Email with full tool access; **profiles** isolate config, sessions and memory; **plugins**, MCP, webhooks, cron and skins extend it.

**This skill is a hub.** The body covers identity, quick start, spawning and hard invariants. Load the matching reference before you answer a detail question.

**Docs:** https://hermes-agent.nousresearch.com/docs/

## Scope & Verification

This guide is not the full feature list. An absent feature is not a missing one.

Verification targets, cheapest first:

- **https://hermes-agent.nousresearch.com/docs/llms.txt** — one line per feature, with a link to the page that answers. It is generated on every build, so it never trails the product. Start here for any "can Hermes do X?". Fetch with `web_extract`, or `curl -s https://hermes-agent.nousresearch.com/docs/llms.txt` when web tools are off. All docs in one file: `/docs/llms-full.txt`.
- CLI: `hermes --help`, `hermes <command> --help`, `hermes_cli/main.py`
- Source: https://github.com/NousResearch/hermes-agent

Never answer "Hermes can't do that" from memory. A negative answer must be checkable.

## Quick Start

```bash
# Install (shell installer — bootstraps PM, Python, dependencies, and the launcher)
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash

# Interactive chat (default surface; set display.interface: tui to launch the Ink TUI instead)
hermes

# Single query
hermes chat -q "What is the capital of France?"

# Setup wizard  /  pick model+provider  /  health check
hermes setup
hermes model
hermes doctor

# Other surfaces
hermes desktop                 # launch the native desktop app (alias: hermes gui)
hermes dashboard               # web admin panel + embedded chat
hermes proxy                   # OpenAI-compatible local proxy backed by your OAuth provider
```

## Key Paths

```
~/.hermes/config.yaml       Main configuration (settings — never secrets)
~/.hermes/.env              API keys and secrets ONLY (under $HERMES_HOME if set)
$HERMES_HOME/skills/        Installed skills
~/.hermes/skins/            Custom themes (see references/themes.md)
~/.hermes/desktop-plugins/  Desktop app UI plugins (see references/desktop-plugins.md)
~/.hermes/tui-widgets/      TUI widget apps (see references/tui-widgets.md)
~/.hermes/pets/             Installed pet mascots (see references/petdex.md)
~/.hermes/state.db          Canonical session store (SQLite + FTS5)
~/.hermes/sessions/         Gateway routing index, request dumps, *.jsonl transcripts
~/.hermes/logs/             Gateway and error logs
~/.hermes/auth.json         OAuth tokens and credential pools
~/.hermes/hermes-agent/     Source code (if git-installed)
```

A profile uses `~/.hermes/profiles/<name>/` with the same layout. Resolve the real home from `$HERMES_HOME` — never hardcode `~/.hermes`.

## Routing Table — load the reference for the task

| User wants... | Load |
| --- | --- |
| **Anything not listed below — "can Hermes do X?", "how do I set up X?"** | **https://hermes-agent.nousresearch.com/docs/llms.txt** |
| Bots that chat, run routines, or message each other; the Bots tab | docs: `/user-guide/bot-mode` |
| CLI commands, subcommands, flags, "how do I run X" | `references/cli-reference.md` |
| Session identity — naming a spawned run, listing, resuming, and whether it can be steered or stopped | `references/sessions-and-runs.md` |
| In-session slash commands | `references/slash-commands.md` |
| Provider setup, API keys, OAuth | `references/providers-and-models.md` |
| config.yaml sections, toolsets, voice/STT/TTS | `references/configuration.md` |
| AGENTS.md / .hermes.md / CLAUDE.md project rules | `references/project-context-files.md` |
| Secret redaction, PII, approval modes, "reset permissions" | `references/security-privacy.md` |
| Delegation, cron, curator, kanban | `references/background-systems.md` |
| Cron jobs — schedules, delivery, `workdir`, verifying a fire | `references/cron-jobs.md` |
| MCP servers (add, catalog, `hermes mcp`) | `references/native-mcp.md` |
| Webhook routes and event-driven runs | `references/webhooks.md` |
| A custom theme/skin ("synthwave theme", "change the gold ●") | `references/themes.md` + `templates/skin.yaml` |
| A desktop app UI element (pane, widget, ⌘K command, page) | `references/desktop-plugins.md` + `templates/plugin.js` |
| A live TUI panel or modal widget (ticker, clock, dashboard) | `references/tui-widgets.md` + `templates/clock.mjs` |
| Pet mascots — install, select, scale, diagnose | `references/petdex.md` |
| Windows-specific issues (keybinds, WinError 10106, BOM) | `references/windows-quirks.md` |
| Debugging: voice, tools missing, gateway, aux models | `references/troubleshooting.md` |
| Contributing code: adding tools, slash commands, tests | `references/contributor-guide.md` |
| delegate_task "capped at N" reports | `references/delegate-task-concurrency-diagnosis.md` |
| "Can app X use my Nous Portal subscription/OAuth?" | `references/portal-auth-for-third-party-apps.md` |
| Connecting a messaging platform (Telegram, Discord, Slack, WhatsApp, …) | docs: `/user-guide/messaging` |

This list is not the feature list. It is the set of topics that need more than a docs page.

Two theming rules hold without the reference: **you apply skins yourself** — `hermes config set display.skin <name>` repaints every surface live; do not tell the user to run `/skin`. **To tweak one colour, edit the ACTIVE skin** with `hermes skin set <key> <hex>`; never fork `default`, which drops the palette and resets the background.

## Spawning Additional Hermes Instances

Run extra Hermes processes as independent subprocesses with their own sessions, tools and environments.

|  | `delegate_task` | Spawning `hermes` process |
| --- | --- | --- |
| Isolation | Separate conversation, shared process | Fully independent process |
| Duration | Minutes (bounded by parent loop) | Hours/days |
| Tool access | Subset of parent's tools | Full tool access |
| Interactive | No | Yes (PTY mode) |
| Use case | Quick parallel subtasks | Long autonomous missions |

```
terminal(command="hermes chat -q 'Research GRPO papers and write summary to ~/research/grpo.md'", timeout=300)

# Background for long tasks:
terminal(command="hermes chat -q 'Set up CI/CD for ~/myapp'", background=true)
```

Hermes uses prompt_toolkit, which needs a real terminal. Spawn interactive sessions through tmux; add `-w` when the agent edits code, to avoid git conflicts:

```
terminal(command="tmux new-session -d -s agent1 -x 120 -y 40 'hermes -w'", timeout=10)
terminal(command="sleep 8 && tmux send-keys -t agent1 'Build a FastAPI auth service' Enter", timeout=15)
terminal(command="sleep 20 && tmux capture-pane -t agent1 -p", timeout=5)
terminal(command="tmux send-keys -t agent1 'Add rate limiting middleware' Enter", timeout=5)
terminal(command="tmux send-keys -t agent1 '/exit' Enter && sleep 2 && tmux kill-session -t agent1", timeout=10)
```

- **Raw PTY mode has `\r` vs `\n` issues** with prompt_toolkit — go through tmux.
- **Use `cronjob` for scheduled tasks** — it handles delivery and retry; spawning does not.
- **`delegate_task` "capped at N"** and **Portal OAuth for a third-party app** are traps with their own references — see the routing table above.

## Surfaces

The same core drives four surfaces: the Electron desktop app (`hermes desktop` / `hermes gui`; UI plugins in `references/desktop-plugins.md`), the web dashboard (`hermes dashboard`, behind an OAuth/token gate), the Ink TUI with docked widget apps (`hermes --tui`; `references/tui-widgets.md`), and `hermes proxy` — a local OpenAI-compatible API backed by your OAuth provider, so Codex CLI, Aider or Cline need no API key.

## Hard Invariants (never violate, regardless of what you loaded)

- **Never break prompt caching** — don't change past context, toolsets, or the system prompt mid-conversation. The only exception is context compression.
- **Message role alternation** — never two assistant or two user messages in a row; only `tool` results can repeat.
- **Secrets in `.env`, settings in `config.yaml`** — never put a non-credential setting in `.env`.
- **Profile-safe paths** — `get_hermes_home()` in code, `$HERMES_HOME` when resolving paths in a session.
- **Never hand-edit `config.yaml` for the user** — use `hermes config set KEY VAL`; a stray indent corrupts the file and breaks the live gateway.
