# GitHub repository management

Create, clone, fork and configure repositories. Authenticate with GitHub first (see the `github-auth` skill).

## Clone

```bash
git clone https://github.com/owner/repo-name.git
git clone --depth 1 https://github.com/owner/repo-name.git    # shallow
git clone --branch develop https://github.com/owner/repo-name.git
gh repo clone owner/repo-name -- --depth 1
```

## Create

```bash
gh repo create my-new-project --public --clone
gh repo create my-org/my-new-project --public --clone
gh repo create my-new-project --private --description "A useful tool" --license MIT --clone

cd /path/to/existing/project          # from an existing directory
gh repo create my-project --source . --public --push

gh repo create my-new-app --template owner/template-repo --public --clone
```

Without `gh`: POST `/user/repos` (or `/orgs/{org}/repos`), or `/repos/{owner}/{template}/generate` from a template.

## Fork and sync

```bash
gh repo fork owner/repo-name --clone      # adds "upstream" to the clone
gh repo sync $GH_USER/repo-name           # fast-forward the fork

git fetch upstream && git checkout main && git merge upstream/main && git push origin main
```

## Settings

```bash
gh repo edit OWNER/REPO --description "..." --visibility public
gh repo edit OWNER/REPO --enable-wiki=false --enable-issues=true
gh repo edit OWNER/REPO --default-branch main
gh repo edit OWNER/REPO --add-topic "machine-learning,python"
gh repo edit OWNER/REPO --enable-auto-merge
```

**Editing settings requires admin, and GitHub hides the lack of it behind a 404.** Descriptions, topics, visibility and every other setting are admin-only. An account with only write/push gets `HTTP 404: Not Found` from `gh repo edit` and from `PATCH /repos/{owner}/{repo}` — the same response a genuinely missing repository gives, so that 404 does NOT mean the name is wrong. Check first:

```bash
gh api repos/OWNER/REPO --jq '.permissions'   # admin must be true
```

If `admin` is false, stop and report it: no `gh` flag and no token scope can substitute — the permission lives on the repository (or a team with admin), granted by an owner. The broad `repo` scope does not help; it confers admin only where the account already has it. To tell a wall from a bad name, PATCH a known-good value that changes nothing (the repo's own description) — a 404 there confirms the wall, not the path.

`gh repo edit` takes the repository as a positional argument only (`gh repo edit OWNER/REPO --description "..."`); unlike most `gh` commands it has NO `-R`/`--repo` flag, and `-d` is the shorthand for `--description`.

After a successful edit, read it back (`gh repo view OWNER/REPO --json description --jq .description`) before reporting the value set.

## Secrets

```bash
gh secret set API_KEY --body "your-secret-value"
gh secret set SSH_KEY < ~/.ssh/id_rsa
gh secret list
gh secret delete API_KEY
```

The REST path is not a substitute: it needs the repository public key and libsodium sealing. If `gh` is missing and secrets must be set, install `gh` for that one operation.

## Releases

```bash
gh release create v1.0.0 --title "v1.0.0" --generate-notes
gh release create v2.0.0-rc1 --draft --prerelease --generate-notes
gh release create v1.0.0 ./dist/binary --title "v1.0.0" --notes "..."
gh release list
gh release download v1.0.0 --dir ./downloads
```

Assets upload to `https://uploads.github.com/repos/O/R/releases/{id}/assets?name={filename}` with `--data-binary @file` — a different host from `api.github.com`.

## Actions

```bash
gh workflow list
gh run list --limit 10
gh run view <RUN_ID> --log-failed
gh run rerun <RUN_ID> --failed
gh workflow run deploy.yml -f environment=staging
```

REST equivalents: `/actions/workflows`, `/actions/runs`, `/actions/runs/{id}/rerun-failed-jobs`, `/actions/workflows/{id}/dispatches`. Failed logs download as a zip from `/actions/runs/{id}/logs`.

## Branch protection and gists

```bash
gh api repos/O/R/branches/main/protection                        # read
gh api -X PUT repos/O/R/branches/main/protection -f ...          # write, admin only
gh gist create script.py --public --desc "Useful script"
```
