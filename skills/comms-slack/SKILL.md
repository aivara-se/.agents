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
