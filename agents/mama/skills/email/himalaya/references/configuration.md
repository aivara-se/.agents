# Himalaya Configuration Reference

Configuration file location: `~/.config/himalaya/config.toml`

## Version 2

v2 renamed the keys to a flat shape with no `backend.*` block. A working Gmail account, with the password read from a command so no secret sits in the file:

```toml
[accounts.work]
default = true
email = "alias@example.com"
display-name = "Alias"

imap.server = "imaps://imap.gmail.com:993"
imap.sasl.plain.username = "account@gmail.com"
imap.sasl.plain.password.command = "/path/to/get-app-password.sh"

# v2 is `mailbox.alias` (singular), not `folder.aliases`
mailbox.alias.inbox = "INBOX"
mailbox.alias.sent = "[Gmail]/Sent Mail"
mailbox.alias.drafts = "[Gmail]/Drafts"
mailbox.alias.trash = "[Gmail]/Trash"

smtp.server = "smtp://smtp.gmail.com:587"
smtp.starttls = true
smtp.sasl.plain.username = "account@gmail.com"
smtp.sasl.plain.password.command = "/path/to/get-app-password.sh"
```

Select it with `himalaya -a work envelope list`. The `backend.*`, `folder.aliases.*` and `message.send.backend.*` examples below are v1 and a v2 build ignores them — check `himalaya --version` before copying one.

The `email` is what the account sends as, but Gmail still rewrites a `From` that is not a verified _Send mail as_ alias to the authenticated account, and the saved Sent copy keeps the header you wrote — so the two disagree until the alias is set in Gmail.

## Minimal IMAP + SMTP Setup

```toml
[accounts.default]
email = "user@example.com"
display-name = "Your Name"
default = true

# IMAP backend for reading emails
backend.type = "imap"
backend.host = "imap.example.com"
backend.port = 993
backend.encryption.type = "tls"
backend.login = "user@example.com"
backend.auth.type = "password"
backend.auth.raw = "your-password"

# SMTP backend for sending emails
message.send.backend.type = "smtp"
message.send.backend.host = "smtp.example.com"
message.send.backend.port = 587
message.send.backend.encryption.type = "start-tls"
message.send.backend.login = "user@example.com"
message.send.backend.auth.type = "password"
message.send.backend.auth.raw = "your-password"

# Folder aliases — required whenever server folder names differ
# from himalaya's canonical names. See "Folder Aliases" below.
folder.aliases.inbox = "INBOX"
folder.aliases.sent = "Sent"
folder.aliases.drafts = "Drafts"
folder.aliases.trash = "Trash"
```

## Password Options

```toml
backend.auth.raw = "your-password"            # testing only
backend.auth.cmd = "pass show email/imap"     # recommended
# backend.auth.cmd = "security find-generic-password -a user@example.com -s imap -w"
backend.auth.keyring = "imap-example"         # requires the keyring feature
```

With the keyring, run `himalaya account configure <account>` to store the password.

## Gmail Configuration

Use the v1 shape above with hosts `imap.gmail.com:993` (tls) and `smtp.gmail.com:587` (start-tls), `backend.auth.cmd = "pass show google/app-password"`, and the `[Gmail]/` folder names. **Always include the alias block:** without it, save-to-Sent fails after SMTP delivery succeeds (`Sent` is really `[Gmail]/Sent Mail`), `himalaya message send` exits non-zero, and any caller that retries re-runs SMTP — duplicate emails to recipients.

```toml
folder.aliases.inbox = "INBOX"
folder.aliases.sent = "[Gmail]/Sent Mail"
folder.aliases.drafts = "[Gmail]/Drafts"
folder.aliases.trash = "[Gmail]/Trash"
```

Gmail requires an App Password when 2FA is on.

## iCloud Configuration

Hosts are `imap.mail.me.com:993` (tls) and `smtp.mail.me.com:587` (start-tls), with `backend.auth.cmd = "pass show icloud/app-password"` in the same v1 shape as above. Generate an app-specific password at appleid.apple.com.

## Folder Aliases

Map the canonical names (`inbox`, `sent`, `drafts`, `trash`) to whatever the server calls them. Both of these work in v1.2.0:

```toml
[accounts.default]
folder.aliases.sent = "Sent"

[accounts.default.folder.aliases]
sent = "Sent"
```

> **Do not use the singular `alias`.** Pre-v1.2.0 docs showed `[accounts.NAME.folder.alias]`; v1.2.0 parses it without error and never reads it, so every lookup falls through to the canonical name — the Gmail save-to-Sent failure above, and duplicate sends on retry.

## Multiple Accounts

```toml
[accounts.personal]
email = "personal@example.com"
default = true

[accounts.work]
email = "work@company.com"
```

Switch with `himalaya --account work envelope list`.

## Notmuch Backend (local mail)

```toml
[accounts.local]
email = "user@example.com"

backend.type = "notmuch"
backend.db-path = "~/.mail/.notmuch"
```

## OAuth2 Authentication (for providers that support it)

```toml
backend.auth.type = "oauth2"
backend.auth.client-id = "your-client-id"
backend.auth.client-secret.cmd = "pass show oauth/client-secret"
backend.auth.access-token.cmd = "pass show oauth/access-token"
backend.auth.refresh-token.cmd = "pass show oauth/refresh-token"
backend.auth.auth-url = "https://provider.com/oauth/authorize"
backend.auth.token-url = "https://provider.com/oauth/token"
```

## Additional Options

```toml
[accounts.default]
signature = "Best regards,\nYour Name"
signature-delim = "-- \n"
downloads-dir = "~/Downloads/himalaya"
```

Composing uses `$EDITOR` (`export EDITOR="vim"`).
