# GitHub REST API cheatsheet

Base URL `https://api.github.com`; every request needs `-H "Authorization: token ***"`. Use `gh-env.sh` to set `$GITHUB_TOKEN`, `$GH_OWNER`, `$GH_REPO`:

```bash
source "${HERMES_HOME:-$HOME/.hermes}/skills/github/github-auth/scripts/gh-env.sh"
```

## Repositories

- `GET /repos/{owner}/{repo}` — repo info
- `POST /user/repos` — create for yourself; `POST /orgs/{org}/repos` under an org
- `PATCH` / `DELETE /repos/{owner}/{repo}` — update, delete
- `GET /user/repos?per_page=30&sort=updated`, `GET /orgs/{org}/repos` — list
- `POST /repos/{owner}/{repo}/forks` — fork
- `POST /repos/{owner}/{template}/generate` — from a template
- `GET` / `PUT /repos/{owner}/{repo}/topics` — read, set topics

## Pull requests

- `GET /repos/{owner}/{repo}/pulls?state=open` — list; `GET .../pulls/{number}` — one
- `POST /repos/{owner}/{repo}/pulls` — create
- `PATCH /repos/{owner}/{repo}/pulls/{number}` — update
- `GET /repos/{owner}/{repo}/pulls/{number}/files` — changed files
- `PUT /repos/{owner}/{repo}/pulls/{number}/merge` — merge; body `{"merge_method": "squash", "commit_title": "feat: description (#N)"}`; methods `merge`, `squash`, `rebase`
- `POST /repos/{owner}/{repo}/pulls/{number}/requested_reviewers` — request reviewers
- `POST /repos/{owner}/{repo}/pulls/{number}/reviews` — review; events `APPROVE`, `REQUEST_CHANGES`, `COMMENT`
- `POST /repos/{owner}/{repo}/pulls/{number}/comments` — inline comment

## Contents (a file in the tree)

`GET /repos/{owner}/{repo}/contents/{path}?ref={ref}`

`ref` is a query parameter, so it belongs in the URL: `gh api repos/$OWNER/$REPO/contents/PATH -f ref=$BRANCH` sends it as a body field and answers `404 Not Found`. Quote the whole argument instead, and the read shows what the branch carries without a checkout.

```bash
gh api "repos/$OWNER/$REPO/contents/AGENTS.md?ref=$BRANCH" --jq '.content' | base64 -d
```

## Issues

- `GET /repos/{owner}/{repo}/issues?state=open` — list; `GET .../issues/{number}` — one
- `POST /repos/{owner}/{repo}/issues` — create; `PATCH .../issues/{number}` — update
- `POST /repos/{owner}/{repo}/issues/{number}/comments` — comment
- `POST` / `DELETE .../issues/{number}/labels[/{name}]` — add, remove a label; `GET /repos/{owner}/{repo}/labels` — list
- `POST /repos/{owner}/{repo}/issues/{number}/assignees` — assign
- `GET /search/issues?q={query}+repo:{owner}/{repo}` — search

The Issues API also returns PRs. Filter with `"pull_request" not in item` when parsing.

## CI / Actions

- `GET /repos/{owner}/{repo}/actions/workflows` — workflows
- `GET /repos/{owner}/{repo}/actions/runs?per_page=10` — runs; add `?branch={branch}` to filter
- `GET /repos/{owner}/{repo}/actions/runs/{run_id}` — one run; `.../logs` — logs zip
- `POST /repos/{owner}/{repo}/actions/runs/{run_id}/rerun` — re-run; `.../rerun-failed-jobs` — failed jobs only
- `POST /repos/{owner}/{repo}/actions/workflows/{id}/dispatches` — workflow_dispatch
- `GET /repos/{owner}/{repo}/commits/{sha}/status` — commit status; `.../check-runs` — Actions check runs (separate endpoints)

## Releases

- `GET` / `POST /repos/{owner}/{repo}/releases` — list, create
- `GET` / `DELETE /repos/{owner}/{repo}/releases/{id}`
- `POST https://uploads.github.com/repos/{owner}/{repo}/releases/{id}/assets?name={filename}` — upload an asset, on a different host

## Secrets

- `GET /repos/{owner}/{repo}/actions/secrets` — list
- `GET .../actions/secrets/public-key` — the key to seal against
- `PUT` / `DELETE .../actions/secrets/{name}` — set, delete

## Branch protection

- `GET` / `PUT` / `DELETE /repos/{owner}/{repo}/branches/{branch}/protection`

## User, gists, search

- `GET /user` — current user; `GET /user/repos` — your repos
- `GET` / `POST /gists` — list, create
- `GET /search/repositories?q={query}` — search repos

Most list endpoints take `?per_page=100` (max) and `?page=N`; follow the `Link` header's `rel="next"` URL rather than building page numbers.
