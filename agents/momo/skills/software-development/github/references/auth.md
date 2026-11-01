# GitHub Authentication Setup

Two paths: **`git`** (always present; HTTPS token or SSH key) and **`gh`** (if installed; API access and git credentials in one flow).

## Detection flow

```bash
git --version
gh --version 2>/dev/null || echo "gh not installed"
gh auth status 2>/dev/null || echo "gh not authenticated"
git config --global credential.helper 2>/dev/null || echo "no git credential helper"
```

Then:

1. `gh auth status` authenticated → use `gh` for everything.
2. `gh` installed but not authenticated → "gh CLI" below.
3. `gh` missing → check for an existing store first (`ls ~/.config/gh/hosts.yml`). If it exists, install the CLI and the session is already authenticated — no re-auth flow. On Debian/Ubuntu: `apt-get install -y gh`. Fall back to the git-only method only when there is no host entry.

## Method 1: git-only (no gh, no sudo)

### Option A: HTTPS with a token (portable, recommended)

Create a token at **https://github.com/settings/tokens** → "Generate new token (classic)". Scopes: `repo` (read, write, push, PRs), `workflow` (Actions), `read:org` (org repos). Copy it now; it is shown once.

```bash
# "store" saves to ~/.git-credentials in plaintext
git config --global credential.helper store

# Trigger auth: username, then the token as the PASSWORD
git ls-remote https://github.com/<their-username>/<any-repo>.git
```

- **Cache instead of disk:** `git config --global credential.helper 'cache --timeout=28800'`.
- **Per-repo, no prompts:** `git remote set-url origin https://<username>:<token>@github.com/<owner>/<repo>.git`.
- **Identity is required for commits:** `git config --global user.name "Their Name"` and `user.email`.

Verify with `git ls-remote ...` again: no prompt.

### Option B: SSH key

```bash
ls -la ~/.ssh/id_*.pub 2>/dev/null || echo "No SSH keys found"
ssh-keygen -t ed25519 -C "their-email@example.com" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```

They add the public key at **https://github.com/settings/keys** → "New SSH key". Then test and rewrite HTTPS to SSH (identity config as in Option A):

```bash
ssh -T git@github.com
# Expected: "Hi <username>! You've successfully authenticated..."
git config --global url."git@github.com:".insteadOf "https://github.com/"
```

## Method 2: gh CLI

`gh` handles API access and git credentials in one step.

> **PITFALL (agent-driven sessions on Windows):** when you drive `gh auth login` through a pty background process, answer prompts with `process(submit)` — never `process(write)` with a bare `\n`. Enter on a Windows PTY (ConPTY/pywinpty) is a carriage return; a lone `\n` is not delivered as a line terminator, so gh's "Press Enter to open the browser" prompt (a blocking line read) never returns and the login hangs. The browser may also not open on the user's desktop from a background session — if they report that, use the device flow.

```bash
gh auth login
# Select: GitHub.com
# Select: HTTPS
# Authenticate via browser
```

### Manual OAuth device flow (no TTY — proven)

Fallback when interactive login is impractical (headless, no browser launch). Uses gh's public OAuth client id; the user enters a code at github.com/login/device. Scopes `repo,read:org,gist` are the documented minimum for `gh auth login --with-token`; append `,workflow` only to push workflow files.

```bash
# 1. Request a device code (gh's official client_id)
RESP=$(curl -s -X POST -H "Accept: application/json" \
  -d "client_id=178c6fc778ccc68e1d6a&scope=repo,read:org,gist" \
  https://github.com/login/device/code)
DEVICE_CODE=$(echo "$RESP" | sed 's/.*"device_code":"\([^"]*\)".*/\1/')
USER_CODE=$(echo "$RESP" | sed 's/.*"user_code":"\([^"]*\)".*/\1/')
INTERVAL=$(echo "$RESP" | sed 's/.*"interval":\([0-9]*\).*/\1/'); INTERVAL=${INTERVAL:-5}
echo "Tell the user: go to https://github.com/login/device and enter code: $USER_CODE"

# 2. Poll for the token (respect interval; +5s on slow_down; ~15 min expiry).
#    Run this loop as a background process and show the user the code first.
while true; do
  sleep "$INTERVAL"
  POLL=$(curl -s -X POST -H "Accept: application/json" \
    -d "client_id=178c6fc778ccc68e1d6a&device_code=${DEVICE_CODE}&grant_type=urn:ietf:params:oauth:grant-type:device_code" \
    https://github.com/login/oauth/access_token)
  case "$POLL" in
    *access_token*)
      # Never echo the token; pipe it straight into gh.
      # timeout guards the headless-keyring hang (see pitfall below) —
      # on exit 124, fall back to writing ~/.config/gh/hosts.yml directly.
      echo "$POLL" | sed 's/.*"access_token":"\([^"]*\)".*/\1/' | timeout 20 gh auth login --with-token \
        || { echo "WITH_TOKEN_HUNG_OR_FAILED — use the hosts.yml fallback below"; exit 1; }
      gh auth setup-git
      gh auth status
      echo "LOGIN_COMPLETE"; break ;;
    *authorization_pending*) ;;                      # keep polling
    *slow_down*) INTERVAL=$((INTERVAL + 5)) ;;       # back off per GitHub docs
    *expired_token*) echo "CODE_EXPIRED — restart the flow"; exit 1 ;;
    *access_denied*) echo "USER_DENIED"; exit 1 ;;
    *) echo "UNEXPECTED: $POLL"; exit 1 ;;
  esac
done
```

On Windows winget installs gh lands at `/c/Program Files/GitHub CLI` — add it to PATH in the same shell: `export PATH="$PATH:/c/Program Files/GitHub CLI"`.

> **PITFALL (headless Linux): `gh auth login --with-token` can hang forever.** On keyring-less boxes (VPS, containers, no dbus session) gh's credential storage may block indefinitely on a secret-service keyring — even with `--insecure-storage`, and with no output. If it does not return within ~20s (wrap it in `timeout 20 …` to detect this), skip gh's login machinery and write the credential store directly:
>
> ```bash
> # $TOKEN = the access token from the device flow above (never echo it)
> mkdir -p ~/.config/gh
> LOGIN=$(curl -s -H "Authorization: token ***" https://api.github.com/user \
>   | sed 's/.*"login": *"\([^"]*\)".*/\1/')
> printf 'github.com:\n    users:\n        %s:\n            oauth_token: %s\n    git_protocol: https\n    oauth_token: %s\n    user: %s\n' \
>   "$LOGIN" "$TOKEN" "$TOKEN" "$LOGIN" > ~/.config/gh/hosts.yml
> chmod 600 ~/.config/gh/hosts.yml
> gh auth status          # reads hosts.yml directly — verifies without the keyring
> gh auth setup-git       # wires the git credential helper (does not hang)
> ```
>
> `gh auth status` and `setup-git` read the file store without touching the keyring, so they work immediately.

### Token login (headless / SSH servers)

```bash
echo "<THEIR_TOKEN>" | gh auth login --with-token

# Set up git credentials through gh
gh auth setup-git
```

If `--with-token` hangs, use the hosts.yml fallback above. Verify with `gh auth status`.

## The API without gh

```bash
# Export (preferred — keeps the token out of commands)
export GITHUB_TOKEN="<token>"

curl -s -H "Authorization: token ***" \
  https://api.github.com/user
```

Read the token out of the git credential store:

```bash
uv run python "${HERMES_HOME:-$HOME/.hermes}/skills/github/github-auth/scripts/git-credential-token.py"
```

### Detect the auth method

Run this at the start of any GitHub workflow:

```bash
# Try gh first, fall back to git + curl
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  echo "AUTH_METHOD=gh"
elif [ -n "$GITHUB_TOKEN" ]; then
  echo "AUTH_METHOD=curl"
elif _hermes_env="${HERMES_HOME:-$HOME/.hermes}/.env"; [ -f "$_hermes_env" ] && grep -q "^GITHUB_TOKEN=" "$_hermes_env"; then
  export GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$_hermes_env" | head -1 | cut -d= -f2 | tr -d '\n\r')
  echo "AUTH_METHOD=curl"
elif grep -q "github.com" ~/.git-credentials 2>/dev/null; then
  export GITHUB_TOKEN=$(uv run python "${HERMES_HOME:-$HOME/.hermes}/skills/github/github-auth/scripts/git-credential-token.py")
  echo "AUTH_METHOD=curl"
else
  echo "AUTH_METHOD=none"
  echo "Need to set up authentication first"
fi
```

## Troubleshooting

| Problem | Solution |
| --- | --- |
| `git push` asks for password | GitHub dropped password auth. Use a token as the password, or SSH |
| `remote: Permission to X denied` | Token lacks `repo` scope — regenerate |
| `fatal: Authentication failed` | Stale cached credentials — `git credential reject`, then re-authenticate |
| `ssh: connect to host github.com port 22: Connection refused` | SSH over 443: `Host github.com` with `Port 443` and `Hostname ssh.github.com` in `~/.ssh/config` |
| `gh: command not found` but `~/.config/gh/hosts.yml` exists | Install the CLI (`apt-get install -y gh`); the token is stored, so `gh auth status` passes with no login |
