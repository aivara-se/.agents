# GitHub Authentication

Two paths:

- **`git`** (always available) — HTTPS personal access token or SSH key.
- **`gh`** (if installed) — one step for API access and git credentials.

## gh binary gone, credentials intact

A rebuild drops `/usr/bin/gh` while the bind-mounted `~/.config/gh/hosts.yml` survives. Treat that as an install, not an auth problem:

```bash
VER=$(curl -sSL https://api.github.com/repos/cli/cli/releases/latest \
  | grep -m1 '"tag_name"' | sed -E 's/.*"v([^"]+)".*/\1/')
curl -sSL -o /tmp/gh.tar.gz \
  "https://github.com/cli/cli/releases/download/v${VER}/gh_${VER}_linux_amd64.tar.gz"
tar xzf /tmp/gh.tar.gz -C /tmp
install -m 755 "/tmp/gh_${VER}_linux_amd64/bin/gh" "$HOME/.local/bin/gh"
PATH="$HOME/.local/bin:$PATH" gh auth status   # verifies hosts.yml, no login
```

Install into the home directory, not `/usr/local/bin`: the home is the bind-mounted, persistent part of a sandbox, so the repair survives the next rebuild instead of running every session.

Then repoint git's credential helper. `gh auth setup-git` (or an earlier install) writes an absolute helper such as `!/usr/bin/gh auth git-credential`, and once that binary is gone every `git push` fails with `/usr/bin/gh: not found` and `could not read Username` — which reads as an auth failure and is not one. The key can hold several values, so `--set` refuses with "cannot overwrite multiple values":

```bash
git config --global --unset-all credential.https://github.com.helper
git config --global --add credential.https://github.com.helper '!/root/.local/bin/gh auth git-credential'
```

Bun has the same shape: the release tarball installs `bun` only, so `bunx` (which bun's own scripts call) is missing until `ln -sf "$HOME/.local/bin/bun" "$HOME/.local/bin/bunx"`.

## Detection

```bash
git --version
gh --version 2>/dev/null || echo "gh not installed"
gh auth status 2>/dev/null || echo "gh not authenticated"
git config --global credential.helper 2>/dev/null || echo "no git credential helper"
```

1. `gh auth status` authenticated → use `gh` for everything.
2. `gh` installed, not authenticated → Method 2.
3. `gh` missing but `~/.config/gh/hosts.yml` exists → the credentials are still valid. Install the binary and go straight to `gh auth status`; never re-run the login flow.
4. `gh` missing, no store → Method 1, no sudo needed.

## Method 1: git only

### Option A: HTTPS with a personal access token

Create the token at **https://github.com/settings/tokens** ("Generate new token (classic)"), scopes `repo` (read, write, push, PRs), `workflow` (trigger Actions), `read:org` (organization repos). It is shown once.

```bash
git config --global credential.helper store   # plaintext ~/.git-credentials
git ls-remote https://github.com/<their-username>/<any-repo>.git
# Username: their GitHub username; Password: the token, not their password
```

Alternatives: `credential.helper 'cache --timeout=28800'` keeps it in memory only; `git remote set-url origin https://<username>:<token>@github.com/<owner>/<repo>.git` embeds it per repo.

Identity, required for commits:

```bash
git config --global user.name "Their Name"
git config --global user.email "their-email@example.com"
```

### Option B: SSH key

```bash
ls -la ~/.ssh/id_*.pub 2>/dev/null || echo "No SSH keys found"
ssh-keygen -t ed25519 -C "their-email@example.com" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub     # add at https://github.com/settings/keys
ssh -T git@github.com         # "Hi <username>! You've successfully authenticated..."
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

## Method 2: gh CLI

### Interactive login (desktop)

```bash
gh auth login   # GitHub.com → HTTPS → login with a browser
```

**PITFALL (agent-driven sessions on Windows):** when driving `gh auth login` through a pty background process, answer prompts with `process(submit)` — never `process(write)` with a bare `\n`. Enter on a Windows PTY (ConPTY/pywinpty) is a carriage return; a lone `\n` is not delivered as a line terminator, so "Press Enter to open the browser" (a blocking line read) never returns and the login hangs. The browser may also not open from a background session; if the user reports that, use the device flow.

### OAuth device flow (no TTY)

Uses gh's public client id; the user enters a code at github.com/login/device. `repo,read:org,gist` is the documented minimum for `--with-token`; append `,workflow` only if you push workflow files.

```bash
RESP=$(curl -s -X POST -H "Accept: application/json" \
  -d "client_id=178c6fc778ccc68e1d6a&scope=repo,read:org,gist" \
  https://github.com/login/device/code)
DEVICE_CODE=$(echo "$RESP" | sed 's/.*"device_code":"\([^"]*\)".*/\1/')
USER_CODE=$(echo "$RESP" | sed 's/.*"user_code":"\([^"]*\)".*/\1/')
INTERVAL=$(echo "$RESP" | sed 's/.*"interval":\([0-9]*\).*/\1/'); INTERVAL=${INTERVAL:-5}
echo "Tell the user: go to https://github.com/login/device and enter code: $USER_CODE"

# Poll in a background process; show the user the code first.
# ~15 min expiry; +5s on slow_down.
while true; do
  sleep "$INTERVAL"
  POLL=$(curl -s -X POST -H "Accept: application/json" \
    -d "client_id=178c6fc778ccc68e1d6a&device_code=${DEVICE_CODE}&grant_type=urn:ietf:params:oauth:grant-type:device_code" \
    https://github.com/login/oauth/access_token)
  case "$POLL" in
    *access_token*)
      # Never echo the token; pipe it into gh. timeout guards the keyring hang.
      echo "$POLL" | sed 's/.*"access_token":"\([^"]*\)".*/\1/' | timeout 20 gh auth login --with-token \
        || { echo "WITH_TOKEN_HUNG_OR_FAILED — use the hosts.yml fallback below"; exit 1; }
      gh auth setup-git
      gh auth status
      echo "LOGIN_COMPLETE"; break ;;
    *authorization_pending*) ;;
    *slow_down*) INTERVAL=$((INTERVAL + 5)) ;;
    *expired_token*) echo "CODE_EXPIRED — restart the flow"; exit 1 ;;
    *access_denied*) echo "USER_DENIED"; exit 1 ;;
    *) echo "UNEXPECTED: $POLL"; exit 1 ;;
  esac
done
```

On Windows winget installs, gh lands at `/c/Program Files/GitHub CLI` — add it in the same shell: `export PATH="$PATH:/c/Program Files/GitHub CLI"`.

**PITFALL (headless Linux): `gh auth login --with-token` can hang forever.** On keyring-less boxes (VPS, containers, no dbus session) credential storage may block indefinitely waiting on a secret-service keyring — even with `--insecure-storage`, and with no output. If it does not return within ~20s (wrap it in `timeout 20 …`), skip gh's login machinery and write the store directly:

```bash
# $TOKEN = the access token from the device flow above (never echo it)
mkdir -p ~/.config/gh
LOGIN=$(curl -s -H "Authorization: token ***" https://api.github.com/user \
  | sed 's/.*"login": *"\([^"]*\)".*/\1/')
printf 'github.com:\n    users:\n        %s:\n            oauth_token: %s\n    git_protocol: https\n    oauth_token: %s\n    user: %s\n' \
  "$LOGIN" "$TOKEN" "$TOKEN" "$LOGIN" > ~/.config/gh/hosts.yml
chmod 600 ~/.config/gh/hosts.yml
gh auth status          # reads hosts.yml directly, no keyring
gh auth setup-git       # wires the git helper (does not hang)
```

### Token login (headless, SSH servers)

```bash
echo "<THEIR_TOKEN>" | gh auth login --with-token
gh auth setup-git
gh auth status
```

If `--with-token` hangs, use the `hosts.yml` fallback above.

## The API without gh

Export the token so it stays out of commands:

```bash
export GITHUB_TOKEN="<token>"
curl -s -H "Authorization: token ***" https://api.github.com/user
```

To reuse a token already in the git credential store:

```bash
uv run python "${HERMES_HOME:-$HOME/.hermes}/skills/github/github-auth/scripts/git-credential-token.py"
```

## Troubleshooting

| Problem | Solution |
| --- | --- |
| `git push` asks for password | GitHub disabled password auth. Use a token as the password, or switch to SSH |
| `remote: Permission to X denied` | Token lacks `repo` scope — regenerate with the right scopes |
| `fatal: Authentication failed` | Cached credentials are stale — `git credential reject`, then re-authenticate |
| `ssh: connect to host github.com port 22: Connection refused` | SSH over 443: add `Host github.com` with `Port 443` and `Hostname ssh.github.com` to `~/.ssh/config` |
| Credentials not persisting | Check `git config --global credential.helper` — must be `store` or `cache` |
| Multiple GitHub accounts | Different keys per host alias in `~/.ssh/config`, or per-repo credential URLs |
| `gh: command not found`, no sudo | Method 1 — no install needed |
| `gh: command not found`, `~/.config/gh/hosts.yml` present | Reinstall the binary; the stored token is still good — do not re-login |
