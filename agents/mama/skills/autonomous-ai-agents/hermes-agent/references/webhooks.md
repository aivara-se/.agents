# Webhook Subscriptions

An external service (GitHub, GitLab, Stripe, CI, an IoT sensor, a monitor) starts a Hermes run by POSTing an event to a URL.

## Setup (required first)

The webhook platform must be enabled. `hermes webhook list` reports when it is not; then run `hermes gateway setup` (wizard: enable webhooks, port, global HMAC secret), or add to `~/.hermes/config.yaml`:

```yaml
platforms:
  webhook:
    enabled: true
    extra:
      port: 8644
      secret: "your-webhook-secret-here"
```

Omitting `host` listens on both IPv4 and IPv6 through the dual-stack default. Set an address only to restrict the bind. `WEBHOOK_ENABLED`, `WEBHOOK_PORT` and `WEBHOOK_SECRET` also set these values.

Then start or restart the gateway and check it:

```bash
hermes gateway run
# Or if using systemd:
systemctl --user restart hermes-gateway
curl http://localhost:8644/health
```

## Commands

### Create a subscription

```bash
hermes webhook subscribe <name> \
  --prompt "Prompt template with {payload.fields}" \
  --events "event1,event2" \
  --description "What this does" \
  --skills "skill1,skill2" \
  --deliver telegram \
  --deliver-chat-id "12345" \
  --secret "optional-custom-secret"
```

It returns the webhook URL and HMAC secret; the user configures their service to POST there.

### Bind a route to a profile

With `gateway.multiplex_profiles` enabled, a route carries a `profile` field and is served under `/p/<profile>/webhooks/<route>`. The route's HMAC secret binds to that profile, and a valid signature whose `/p/<profile>/` prefix does not match the binding is still rejected. A route with no `profile` is default-profile-only.

```yaml
platforms:
  webhook:
    extra:
      routes:
        - name: deploy-bot
          profile: coder
```

Rebinding an existing route to another profile (`--route-profile` on a dynamic subscription) **rotates its HMAC secret** — the old profile's secret stops authenticating — so update the caller's copy in the same change.

This is the supported way to make an external service start a run **as a named profile** without shelling out to `hermes` on the host.

### Filter or transform payloads before the agent runs

Broad streams (Todoist, GitHub) fire on every update. Two mechanisms narrow them:

- **Declarative `filters`** (config.yaml routes only): conditions on payload fields, event type or headers — `equals`, `not_equals`, `contains`, `exists`, `missing`, `in`, `in_file`, `regex`, grouped with `all`/`any`/`not`. A non-match is ignored with HTTP 200.
- **Route scripts** (`--script`, or `script:` on a config route): a script under `~/.hermes/scripts/` gets the payload as JSON on stdin. JSON stdout replaces the payload before templating; empty stdout, `[SILENT]` or a nonzero exit ignores the webhook. `.sh`/`.bash` run with bash, anything else with Python. Scripts cannot live outside `~/.hermes/scripts/` (path traversal is blocked).

```bash
hermes webhook subscribe todoist-hermes \
  --prompt "Task changed: {payload.content}" \
  --script "todoist-hermes-label.py" \
  --deliver telegram --deliver-chat-id "12345"
```

Full filter syntax: https://hermes-agent.nousresearch.com/docs/user-guide/messaging/webhooks#payload-filters

### Inspect, remove, test

```bash
hermes webhook list
hermes webhook remove <name>
hermes webhook test <name>
hermes webhook test <name> --payload '{"key": "value"}'
```

## Prompt templates

Prompts take `{dot.notation}` for nested fields: `{issue.title}`, `{pull_request.user.login}`, `{data.object.amount}`, `{sensor.temperature}`. With no `--prompt`, the whole JSON payload goes into the agent prompt.

## Common patterns

GitHub issues, delivering to a chat:

```bash
hermes webhook subscribe github-issues \
  --events "issues" \
  --prompt "New GitHub issue #{issue.number}: {issue.title}\n\nAction: {action}\nAuthor: {issue.user.login}\nBody:\n{issue.body}\n\nPlease triage this issue." \
  --deliver telegram \
  --deliver-chat-id "-100123456789"
```

Then in the repo: Settings → Webhooks → Add webhook. Payload URL is the returned `webhook_url`, content type `application/json`, secret is the returned secret, events "Issues".

The same shape covers any source: swap `--events`, `--prompt` and `--deliver` (`github_comment` with `--skills "github-code-review"` for PR review, `discord` for CI, `origin` for a monitor).

### Direct delivery (no agent, no LLM cost)

Add `--deliver-only` to skip the agent loop: the rendered `--prompt` template becomes the message body and goes straight to the adapter.

```bash
hermes webhook subscribe antenna-matches \
  --deliver telegram \
  --deliver-chat-id "123456789" \
  --deliver-only \
  --prompt "🎉 New match: {match.user_name} matched with you!" \
  --description "Antenna match notifications"
```

Use it for push notifications (Supabase/Firebase → Telegram), alerts that forward verbatim, and agent-to-agent pings where an LLM round trip is waste. The POST returns `200 OK` on delivery and `502` on target failure, so upstream services can retry. HMAC auth, rate limits and idempotency still apply, and `--deliver` must be a real target — `--deliver log` is rejected.

### Let the user reply to a delivery

Each event runs in its own session, so by default the agent in the target chat has no record of what a route delivered ("what are you referring to?"). Add `--mirror-to-session` and each delivered message is also written into that chat's session as `[Webhook delivery: <route>]` plus the text. Off by default: the text enters the conversation as if the user had sent it (on `--deliver-only` routes, as the raw payload), so use it only for sources the user trusts. It is skipped when the chat has no session yet.

## Security

- Each subscription gets an auto-generated HMAC-SHA256 secret, or your own with `--secret`; the adapter validates it on every POST. Static config.yaml routes cannot be overwritten by a dynamic subscription. Subscriptions persist to `~/.hermes/webhook_subscriptions.json`.

## How it works

`hermes webhook subscribe` writes that JSON file, and the adapter hot-reloads it per request (mtime-gated). A POST that matches a route formats the prompt, runs the agent, and delivers the reply to the configured target.

## Troubleshooting

1. **Gateway running?** `systemctl --user status hermes-gateway`; **listening?** `curl http://localhost:8644/health` returns `{"status": "ok"}`.
2. **Logs:** `grep webhook ~/.hermes/logs/gateway.log | tail -20`.
3. **Signature mismatch?** Compare the service's secret with `hermes webhook list`. GitHub sends `X-Hub-Signature-256`, GitLab sends `X-Gitlab-Token`.
4. **Firewall/NAT?** The URL must be reachable from the service; for local work use a tunnel (ngrok, cloudflared).
5. **Wrong event type?** Check `--events` against what the service sends, and confirm with `hermes webhook test <name>`.
