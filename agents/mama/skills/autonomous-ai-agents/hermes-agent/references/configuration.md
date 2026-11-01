# Configuration, Toolsets & Voice

Edit with `hermes config edit` or `hermes config set section.key value`. Full reference: https://hermes-agent.nousresearch.com/docs/user-guide/configuration

### Config Sections (most-used keys)

| Section | Key options |
| --- | --- |
| `model` | `default`, `provider`, `base_url`, `api_key`, `context_length`, `aliases` |
| `agent` | `max_turns` (90), `tool_use_enforcement`, `service_tier`, `verify_on_stop` |
| `terminal` | `backend` (local/docker/ssh/modal/daytona/singularity), `cwd`, `timeout` (180) |
| `compression` | `enabled`, `threshold` (0.50), `target_ratio` (0.20) |
| `display` | `skin`, `interface` (cli/tui), `language`, `show_reasoning`, `show_cost`, `pet` |
| `approvals` | `mode` (smart/manual/off), `timeout`, `cron_mode` |
| `stt` | `enabled`, `provider` (local/groq/openai/mistral/elevenlabs/deepinfra) |
| `tts` | `provider` (edge/elevenlabs/openai/minimax/mistral/neutts/gemini/piper/kittentts/deepinfra/xai) |
| `memory` | `memory_enabled`, `user_profile_enabled`, `provider`, `write_approval` |
| `security` | `redact_secrets`, `website_blocklist` |
| `delegation` | `model`, `provider`, `max_concurrent_children`, `max_iterations` (50), `max_spawn_depth` |
| `checkpoints` | `enabled`, `max_snapshots` (50) |
| `curator` | `enabled`, `consolidate` (false, opt-in aux-model consolidation), `interval_hours`, `stale_after_days` |

`hermes config check` reports sections missing from an older config.

### Toolsets

Enable or disable with `hermes tools` (interactive) or `hermes tools enable/disable NAME`. The full list is the `TOOLSETS` dict in `toolsets.py`; `_HERMES_CORE_TOOLS` is the default bundle most platforms inherit.

Gates you cannot read off that dict:

- `homeassistant` (`ha_*` tools) and `spotify` (`spotify_*` tools) are **not built in** — install the catalog plugin (`hermes plugins install <name>`).
- `kanban` tools are gated to workers, `debugging` is off by default, and `safe` is the minimal set for a locked-down session.
- `discord`, `discord_admin`, `feishu_doc`, `feishu_drive` and `yuanbao` need their credentials.

Tool changes take effect on `/reset` (a new session), never mid-conversation — prompt caching breaks otherwise.

## Voice

### STT (Voice → Text)

Messaging platforms' voice messages are auto-transcribed.

```yaml
stt:
  enabled: true
  provider: local # local (faster-whisper, free) | groq | openai | mistral | elevenlabs | deepinfra
  local:
    model: base # tiny, base, small, medium, large-v3, turbo
```

Auto-detect order: local faster-whisper (`python -c "import pm; pm.sync_venv(['stt-whisper'], explicit=True)"`) → Groq (`GROQ_API_KEY`, free tier) → OpenAI (`VOICE_TOOLS_OPENAI_KEY`) → Mistral Voxtral (`MISTRAL_API_KEY`).

### TTS (Text → Voice)

| Provider                           | Env var                  | Free?     |
| ---------------------------------- | ------------------------ | --------- |
| Edge TTS (default)                 | None                     | Yes       |
| ElevenLabs                         | `ELEVENLABS_API_KEY`     | Free tier |
| OpenAI                             | `VOICE_TOOLS_OPENAI_KEY` | Paid      |
| MiniMax                            | `MINIMAX_API_KEY`        | Paid      |
| Mistral                            | `MISTRAL_API_KEY`        | Paid      |
| Gemini                             | `GOOGLE_API_KEY`         | Free tier |
| NeuTTS / Piper / KittenTTS (local) | None                     | Free      |

Voice commands: `/voice on` (voice-to-voice), `/voice tts` (always voice), `/voice off`.
