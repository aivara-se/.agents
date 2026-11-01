# GitHub Apps

A GitHub App is an identity, not a token. Install it on an organisation or a repository, then act as it. Read this before designing an integration that needs GitHub to call you, or that needs to read back what GitHub sent.

## Permissions gate delivery, not only the API

An app receives a webhook event only if it holds read access for that event's resource. A design that says "the app needs no repository permission" is wrong: it would receive nothing to act on.

| Event | Minimum permission |
| --- | --- |
| `pull_request`, `pull_request_review`, `pull_request_review_comment` | Pull requests: read |
| `issues`, `issue_comment` | Issues: read |
| `workflow_run`, `workflow_job` | Actions: read |
| `check_run`, `check_suite` | Checks: read |
| `installation`, `installation_repositories` | none — app-level |

`metadata: read` is granted to every app and is not selectable. A comment on a pull request arrives as `issue_comment`, so a pull request flow that reads comments needs Issues as well as Pull requests.

## Auth

- **JWT** — sign RS256 with the app's private key: `iss` is the app id, `iat` 60 s in the past for clock skew, `exp` at most 10 minutes. It authenticates app-level endpoints only.
- **Installation token** — `POST /app/installations/{id}/access_tokens` with the JWT. It expires after 1 hour; cache it and renew before expiry.
- The private key is a file, mode `600`, read at boot. Regenerating it in the app settings invalidates the old one at the next use, not in the running process.
- The webhook secret is set on the app, not on an organisation hook. The signature is the same `X-Hub-Signature-256` HMAC over the raw body, so a receiver does not change.

## The app delivery log

GitHub keeps the app's webhook deliveries for **three days**, and this is the only readable record of what it sent:

```bash
# list — JWT auth, no installation permission needed
GET /app/hook/deliveries?per_page=100
# one delivery with its full request payload
GET /app/hook/deliveries/{delivery_id}
# ask GitHub to send it again
POST /app/hook/deliveries/{delivery_id}/attempts
```

Use it to recover deliveries a receiver accepted but did not act on, and to answer "did GitHub send this at all". Prefer re-deciding the stored payload in process over `attempts`: a redelivery re-enters the receiver, where an idempotency key on the body may drop it as a repeat of a delivery that was already seen.

## Scope and limits

- `installation` and `installation_repositories` carry the repository list and the granted permissions. That list is the app's scope, and it changes only when someone installs or uninstalls.
- Installation tokens share a rate limit of 5,000 requests per hour per installation, rising 50 per repository above 20 repositories and 50 per user above 20 users, capped at 12,500.
- An app can be installed on selected repositories. Use that to bound scope; a delivery from a repository outside the installation is a refusal to code, not a policy to trust.

## Writing to a thread

- **A pull request comment needs both write scopes.** `POST /repos/{o}/{r}/issues/{n}/comments` documents `issues: write` or `pull_requests: write`, but an installation token holding only `issues: write` answers `403` with `X-Accepted-GitHub-Permissions: issues=write; pull_requests=write`. Grant both before promising a bot comment on a pull request.
- **Creating notifies; editing does not.** A status comment updated in place is silent to every watcher, so it cannot double as an alert: a state that needs a human needs its own created comment. Say which of the two each message is.
- **A login in a body is a mention.** `@login` notifies that account. A bot comment that merely reports on accounts writes the login as a link, never a mention, or it summons them on every edit.

## Verifying from the shell

`gh` authenticates as a user, so it cannot read `/app/*` endpoints. Build the JWT, then:

```bash
curl -s -H "Authorization: Bearer $JWT" -H 'Accept: application/vnd.github+json' \
  https://api.github.com/app/hook/deliveries?per_page=5
```

A `401` here is usually `iat` too far in the future, `iss` set to the client id instead of the app id, or a key that does not match the app.

## Pitfalls

- **Do not grant write to get a read.** Every write scope widens what a leaked key can do; if the design needs the log, the JWT reaches it with no installation permission at all.
- **The three-day window is the recovery limit.** A design that promises no lost event must state what happens past it, and say so where the promise is made.
- **A write grant is coarser than the act.** `issues: write` buys a comment and also permits a close, a label, an assignment and an edit; `checks: write` buys a check run and also lets the app fail a required one. Name the act the code performs beside the act the grant allows, or a reviewer cannot see the gap.
- **A permission added later is a re-installation.** An owner may have to approve the new scope; the app keeps the old grant until then, and the design should say what it does while one event family is missing.
