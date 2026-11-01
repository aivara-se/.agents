---
name: himalaya
description: "Himalaya CLI: IMAP/SMTP email from terminal."
version: 1.1.0
author: community
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Email, IMAP, SMTP, CLI, Communication]
    homepage: https://github.com/pimalaya/himalaya
prerequisites:
  commands: [himalaya]
---

# Himalaya Email CLI

Himalaya is a terminal email client over IMAP, SMTP, Notmuch or Sendmail.

This skill is not the Hermes Email gateway adapter. The adapter lets people email the agent; this skill lets the agent operate a mailbox, and needs the external `himalaya` CLI.

## Check the version first

`himalaya --version` decides the command line, and v2 renamed most of it:

| The v1 form this file shows | The v2 form |
| --- | --- |
| `himalaya folder list` | `himalaya mailbox list` |
| `himalaya envelope list --folder "Sent"` | `himalaya envelope list -m sent` |
| `himalaya template send` (piped message) | `himalaya message send` (piped message) |

A v2 config is flat and role-based — `imap.server`, `smtp.server`, `mailbox.alias.sent` — where the v1 example uses `backend.*` and `folder.aliases.*`. `envelope list` on v2 also takes `-r` (recipients) and `-s` (page size); the folder flag is `-m`, never `--folder`.

Two things bite on send. **`message send` saves a copy as well as sending**, so read it back with `himalaya envelope list -m sent -s 5` and check for exactly one: a duplicate send cannot be unsent, and a second writer (another session, a retry) leaves no other trace. And **the saved copy can carry the `From:` you wrote while the delivered message shows the SMTP account** — Gmail rewrites a From that is not a verified _Send mail as_ alias, so an address that only forwards inbound mail cannot be the sender until it is added there.

## References

- `references/configuration.md` (config file setup + IMAP/SMTP authentication)
- `references/message-composition.md` (MML syntax for composing emails)

## Prerequisites

1. Himalaya CLI installed (`himalaya --version` to verify)
2. A config file at `~/.config/himalaya/config.toml`
3. IMAP/SMTP credentials (password stored securely)

### Installation

```bash
# Pre-built binary (Linux/macOS — recommended)
curl -sSL https://raw.githubusercontent.com/pimalaya/himalaya/master/install.sh | PREFIX=~/.local sh

# macOS via Homebrew
brew install himalaya

# Or via cargo (any platform with Rust)
cargo install himalaya --locked
```

## Configuration

Run `himalaya account configure` for the wizard, or write `~/.config/himalaya/config.toml` by hand. The account template, password options (`auth.cmd`, keyring) and per-provider blocks are in `references/configuration.md`.

> **Alias syntax.** Use `folder.aliases.X` (plural, dotted keys, directly under `[accounts.NAME]`). v1.2.0 **silently ignores** the pre-v1.2.0 `[accounts.NAME.folder.alias]` sub-section — TOML parses, the resolver never reads it, and every lookup falls through to the canonical name. On Gmail that makes save-to-Sent fail _after_ SMTP delivery succeeds, so `message send` exits non-zero; a caller that retries re-runs SMTP and the recipients get duplicates. v2 uses `mailbox.alias.X`.

## Hermes Integration Notes

- **Reading, listing, searching, moving, deleting** go through the terminal tool.
- **Composing, replying, forwarding** — pipe the message (see below). Interactive `$EDITOR` mode works with `pty=true` + background, but you must know the editor and its commands.
- `--output json` gives structured output.
- `himalaya account configure` needs input: `terminal(command="himalaya account configure", pty=true)`.

## Common Operations

```bash
# Folders and listing
himalaya folder list
himalaya envelope list                                  # INBOX
himalaya envelope list --folder "Sent"
himalaya envelope list --page 1 --page-size 20
himalaya envelope list from john@example.com subject meeting

# Reading
himalaya message read 42
himalaya message export 42 --full

# Compose, reply, forward — pipe, do not open $EDITOR
himalaya template reply 42 | sed 's/^$/\nYour reply text here\n/' | himalaya template send
himalaya template forward 42 | sed 's/^To:.*/To: newrecipient@example.com/' | himalaya template send

# Move, copy, delete (target folder first, then the id)
himalaya message move "Archive" 42
himalaya message copy "Important" 42
himalaya message delete 42

# Flags, attachments
himalaya flag add 42 --flag seen
himalaya flag remove 42 --flag seen
himalaya attachment download 42
himalaya attachment download 42 --downloads-dir ~/Downloads
```

Write a new message by piping it, or with header flags:

```bash
cat << 'EOF' | himalaya template send
From: you@example.com
To: recipient@example.com
Subject: Test Message

Hello from Himalaya!
EOF

himalaya message write -H "To:recipient@example.com" -H "Subject:Test" "Message body here"
```

`himalaya message write` with no piped input opens `$EDITOR`. Reply-all (`himalaya message reply 42 --all`) is interactive too — use the template pipe instead.

## Multiple Accounts

```bash
himalaya account list
himalaya --account work envelope list
```

## Output and debugging

```bash
himalaya envelope list --output json
himalaya envelope list --output plain
RUST_LOG=debug himalaya envelope list
RUST_LOG=trace RUST_BACKTRACE=1 himalaya envelope list
```

## Tips

- **Message ids are relative to the current folder** — re-list after a folder change.
- **Use MML for rich mail and attachments** — `references/message-composition.md`.
- **Never store a password in the file** — use `pass`, a keyring, or a command that prints it.
