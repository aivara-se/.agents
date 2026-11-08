# GitHub Repository Management

Create, clone, fork, configure and manage repositories. `gh` commands first, the REST path noted where it differs.

## Prerequisites

Authenticated with GitHub (see `github-auth` skill). For auth detection and the `$OWNER`/`$REPO` extraction, use the blocks in `references/pr-workflow.md`. Get your login with `gh api user --jq '.login'`.

## 1. Cloning

```bash
git clone https://github.com/owner/repo-name.git
git clone https://github.com/owner/repo-name.git ./my-local-dir
git clone --depth 1 https://github.com/owner/repo-name.git
git clone --branch develop https://github.com/owner/repo-name.git
git clone git@github.com:owner/repo-name.git
gh repo clone owner/repo-name
```

## 2. Creating

```bash
gh repo create my-new-project --public --clone
gh repo create my-new-project --private --description "A useful tool" --license MIT --clone
gh repo create my-org/my-new-project --public --clone
cd /path/to/existing/project && gh repo create my-project --source . --public --push
gh repo create my-new-app --template owner/template-repo --public --clone
```

### Seeding a new repository through a pull request

An empty repository has no base commit, so a branch has nothing to open a pull request against:

```bash
gh repo create aivara-se/.template --public --add-readme \
  --description "What this repository is"      # --add-readme gives main its first commit
git clone https://github.com/aivara-se/.template.git
cd .template && git switch -c docs/first-change # then write, commit, push, gh pr create
```

Clone over HTTPS: `gh`'s token authenticates it, and an unconfigured SSH key fails the `git@github.com:` form. A new organisation repository also inherits no branch protection and no community files — set them deliberately rather than assuming the org's other repositories' settings follow it.

With curl, POST `/user/repos` (or `/orgs/<org>/repos`) with `name`, `description`, `private`, `auto_init`, `license_template`; POST `/repos/owner/template-repo/generate` for a template.

## 3. Forking

```bash
gh repo fork owner/repo-name --clone
git remote add upstream https://github.com/owner/repo-name.git
```

Keep a fork in sync:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
# or
gh repo sync $GH_USER/repo-name
```

With curl, POST `/repos/owner/repo-name/forks`, wait a few seconds for GitHub to create it, then clone your copy.

The `gh` form adds and names the `upstream` remote for you; with plain git you add it by hand (above).

## 4. Information

```bash
gh repo view owner/repo-name
gh repo list --limit 20
gh search repos "machine learning" --language python --sort stars
```

## 5. Settings

```bash
gh repo edit --description "Updated description" --visibility public
gh repo edit --enable-wiki=false --enable-issues=true
gh repo edit --default-branch main
gh repo edit --add-topic "machine-learning,python"
gh repo edit --enable-auto-merge
```

With curl, PATCH `/repos/$OWNER/$REPO`; topics go to `/repos/$OWNER/$REPO/topics` as a PUT of `{"names": [...]}`.

## 6. Branch protection

Read it at `GET /repos/$OWNER/$REPO/branches/main/protection` and set it at `PUT` on the same path, with `required_status_checks` (`strict`, `contexts`), `required_pull_request_reviews` (`required_approving_review_count`), `enforce_admins` and `restrictions`. A 404 means the rules live in a **ruleset**, so read `GET /repos/$OWNER/$REPO/rulesets` and the ruleset by id first.

```bash
curl -s -X PUT \
  -H "Authorization: token ***" \
  https://api.github.com/repos/$OWNER/$REPO/branches/main/protection \
  -d '{
    "required_status_checks": {
      "strict": true,
      "contexts": ["ci/test", "ci/lint"]
    },
    "enforce_admins": false,
    "required_pull_request_reviews": {
      "required_approving_review_count": 1
    },
    "restrictions": null
  }'
```

## 7. Secrets (Actions)

```bash
gh secret set API_KEY --body "your-secret-value"
gh secret set SSH_KEY < ~/.ssh/id_rsa
gh secret list
gh secret delete API_KEY
```

The API needs the repo's public key and a sealed box (`PyNaCl`) per secret, then a PUT of the encrypted value to `/repos/$OWNER/$REPO/actions/secrets/<NAME>`. `gh secret set` is far simpler: if `gh` is missing and you must set secrets, install it for that operation.

## 8. Releases

```bash
gh release create v1.0.0 --title "v1.0.0" --generate-notes
gh release create v2.0.0-rc1 --draft --prerelease --generate-notes
gh release create v1.0.0 ./dist/binary --title "v1.0.0" --notes "Release notes"
gh release list
gh release download v1.0.0 --dir ./downloads
```

With curl, POST `/repos/$OWNER/$REPO/releases` with `tag_name`, `name`, `body`, `draft`, `prerelease`, `generate_release_notes`. A binary asset uploads to `https://uploads.github.com/repos/$OWNER/$REPO/releases/<id>/assets?name=<name>` with `Content-Type: application/octet-stream`, not to `api.github.com`:

```bash
curl -s -X POST -H "Authorization: token ***" \
  -H "Content-Type: application/octet-stream" \
  "https://uploads.github.com/repos/$OWNER/$REPO/releases/$RELEASE_ID/assets?name=binary-amd64" \
  --data-binary @./dist/binary-amd64
```

## 9. Actions workflows

```bash
gh workflow list
gh run list --limit 10
gh run view <RUN_ID>
gh run view <RUN_ID> --log-failed
gh run rerun <RUN_ID> --failed
gh workflow run ci.yml --ref main
gh workflow run deploy.yml -f environment=staging
```

With curl, read `/repos/$OWNER/$REPO/actions/workflows` and `/actions/runs?per_page=10`; rerun with POST to `/actions/runs/<id>/rerun` or `/rerun-failed-jobs`; dispatch with POST to `/actions/workflows/<id-or-file>/dispatches` and a `{"ref":"main","inputs":{...}}` body. Failed logs download as a zip, so extract them before reading. Repo-level secrets and variables list from `/actions/secrets` with names only; values stay hidden.

## 10. Gists

```bash
gh gist create script.py --public --desc "Useful script"
gh gist list
```

With curl, POST `/gists` with `description`, `public` and a `files` map of filename to `{"content": ...}`; list them from `GET /gists`.
