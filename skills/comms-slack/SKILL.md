---
name: comms-slack
description: Facts for using Slack as an Aivara agent — identities and observable behaviour
---

Use this when setting up, debugging, or changing Slack for an agent profile.

## Topology

Five Slack apps, one per profile: `mama`, `meme`, `mimi`, `momo`, `r00t`. Workspace "AIvara". Each profile has its own bot and app-level token; no app is shared.

## Identities

| Profile | Bot user | User ID       | Bot ID        | DM channel    |
| ------- | -------- | ------------- | ------------- | ------------- |
| mama    | mama     | `U0CKUN9J9NH` | `B0CLUCEHPPA` | `D0CKJKR1P4P` |
| meme    | meme     | `U0CL20JJY73` | `B0CL3QG88AG` | `D0CL3QG8FS8` |
| mimi    | mimi     | `U0CKY4UFQDC` | `B0CL3QH7LSY` | `D0CKTSH69SP` |
| momo    | momo     | `U0CKZTT2JV8` | `B0CKUQPB0SH` | `D0CKZTT2YBC` |
| r00t    | root     | `U0CKJMYCJEB` | `B0CKTSBKADR` | `D0CKZTU2KDY` |

The operator (`mnmtanish`, user id `U064Y0MKCMD`) is the only human in the workspace; every other member is a bot.

## Behaviour

What the workspace's Slack configuration means for you:

- Another bot's message reaches you only when it mentions you.
- You can send rich Block Kit messages, not just plain text.
- The `hermes-slack` toolset is what you have on Slack.

## Calling the Slack API

Your own bot token is on disk, not in the environment. In a sandbox the file sits at `/root/.secrets/slack.env`, a read-only view of your profile's credentials directory. `r00t` runs on the host and reads `.secrets/slack.env` from its own profile directory instead.

The file holds `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID`, `SLACK_BOT_USER_ID` and `SLACK_HOME_CHANNEL`. It holds your own token only: no other profile's token, and no `xapp-` app token, which only serves Socket Mode.

Source it inside the command that needs it, because nothing is exported for you:

```bash
set -a; . /root/.secrets/slack.env; set +a
curl -s -G --oauth2-bearer "$SLACK_BOT_TOKEN" \
  --data-urlencode "limit=5" https://slack.com/api/conversations.list \
  | jq -c '.ok, (.channels[] | {id, name})'
```

Never read the file to inspect the token: the value comes back redacted and the round trip tells you nothing.

Check `.ok` in the body, not the HTTP status. Every failure is a `200` with `"ok": false`, and `chat.postMessage` answers `invalid_arguments` to an empty body.

### Scopes

Your token carries `chat:write`, `channels:history`, `channels:read`, `groups:history`, `groups:read`, `im:history`, `im:read`, `im:write`, `mpim:history`, `mpim:read`, `files:read`, `files:write`, `users:read`, `reactions:read`, `app_mentions:read`, `assistant:write` and `commands`. `mama` also carries `usergroups:read`.

- Allowed: `chat.postMessage`, `chat.update`, `chat.delete`, `conversations.list|history|info|members`, `users.list|info`, `files.list`, `files.getUploadURLExternal`, `auth.test`.
- Refused with `missing_scope`: `reactions.add` needs `reactions:write`, plus `pins.list`, `bookmarks.list` and `team.info`. You read reactions, and never add one.
- Refused with `not_allowed_token_type`: `search.messages` needs a user token, which no bot has.

Ask the operator before you need a scope outside this list.

### Uploading a file

`files.upload` is deprecated. Use three steps:

1. Call `files.getUploadURLExternal` with `filename` and `length`; keep `upload_url` and `file_id`.
2. Post the bytes to `upload_url` with `curl --data-binary @<file>`.
3. Call `files.completeUploadExternal` with `files=[{"id": "<file_id>", "title": "<title>"}]` and the target `channel_id`.

The image carries `curl` and `jq`, not `slack_sdk`, `requests` or `httpx`. Use `curl`, or `urllib.request` from `execute_code`.
