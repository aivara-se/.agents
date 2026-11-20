# Serving the 2.0 web client

## What the engine exposes

One port, the webhook. The record is JSON over `~/.dispatch/dispatch.sock`, which `cmd/dispatch` creates and then chmods `0600`, so only the owner reads it. The client (`web/`, adapter-node) reads that socket in server code; the browser talks to the client only.

- One systemd unit each, the client's started after the engine's, running as the **same user**. `0600` admits the owner alone: a client under another account needs a chown or a group plus a mode change, which is a decision, not a flag.
- `DISPATCH_SOCKET` names another socket; the default is `~/.dispatch/dispatch.sock`.
- The client binds loopback and the host proxy publishes it. Nothing else opens.

## The host's route

- The site sends everything unmatched to the Hermes app on `:9120`, and `/dispatch/v1/webhook/github` already proxies to the engine on `:8645`.
- The client needs `handle /dispatch* { reverse_proxy 127.0.0.1:<client port> }` in the same site block, keeping the prefix in place.
- Caddy orders `handle` blocks by path specificity, so the webhook's longer path wins in either order. Check both orders with three stub upstreams before writing it down.
- `handle_path` is wrong here: it strips `/dispatch`, and the app's root-absolute links then leave the prefix.

## The app's half

`paths.base` alone mounts nothing. Six places carry a root-absolute path and each takes `base` from `$app/paths`: the brand link, `href(job)` in the layout's job list, `href(job)` on the flow page, `new EventSource('/api/stream')`, and the `/` redirect in `+page.server.ts` — plus `paths.base` itself. Prove it with `node build`, a stub socket and curl at the prefix: `sveltekit` → _Serving under a path prefix_.

## Design

`docs/web-client-mock.html` is the reference and `DESIGN.md` the values. The operator compares the running page against the mock, not the diff.

## Access

Neither the client nor `internal/api` authenticates, so publishing the path publishes the whole record — prompts, outputs, tool calls. The proxy is the only place an access rule can stand, and the choice is the operator's; an ADR records the shape without inventing the rule.
