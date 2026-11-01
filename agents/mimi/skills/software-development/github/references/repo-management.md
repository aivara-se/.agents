# GitHub Repository Management

Clone, create, fork, configure and release repositories. `gh` first, then the `git` + `curl` fallback.

## Setup

Authenticate first — see `auth.md`. Then:

```bash
GH_USER=$(gh api user --jq '.login')          # or GET /user with curl

REMOTE_URL=$(git remote get-url origin)
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]||; s|\.git$||')
OWNER=$(echo "$OWNER_REPO" | cut -d/ -f1)
REPO=$(echo "$OWNER_REPO" | cut -d/ -f2)
```

## 1. Clone

```bash
git clone https://github.com/owner/repo-name.git
git clone https://github.com/owner/repo-name.git ./my-local-dir
git clone --depth 1 https://github.com/owner/repo-name.git    # large repos
git clone --branch develop https://github.com/owner/repo-name.git
git clone git@github.com:owner/repo-name.git                  # SSH

gh repo clone owner/repo-name
gh repo clone owner/repo-name -- --depth 1
```

## 2. Create

```bash
gh repo create my-new-project --public --clone
gh repo create my-new-project --private --description "A useful tool" --license MIT --clone
gh repo create my-org/my-new-project --public --clone
cd /path/to/existing/project && gh repo create my-project --source . --public --push
gh repo create my-new-app --template owner/template-repo --public --clone
```

With curl: `POST /user/repos` (or `/orgs/<org>/repos`) with `name`, `description`, `private`, `auto_init`, `license_template`; from a template, `POST /repos/owner/template-repo/generate` with `owner`, `name`, `private`. For an existing local directory: `git init`, `git add .`, `git commit`, `git remote add origin …`, `git push -u origin main`.

## 3. Fork and sync

```bash
gh repo fork owner/repo-name --clone

# curl: POST /repos/owner/repo-name/forks, wait for GitHub to create it
sleep 3 && git clone https://github.com/$GH_USER/repo-name.git
git remote add upstream https://github.com/owner/repo-name.git
```

Keep it current: `git fetch upstream && git checkout main && git merge upstream/main && git push origin main`, or `gh repo sync $GH_USER/repo-name`.

## 4. Info and settings

```bash
gh repo view owner/repo-name
gh repo list --limit 20
gh search repos "machine learning" --language python --sort stars

gh repo edit --description "Updated description" --visibility public
gh repo edit --enable-wiki=false --enable-issues=true
gh repo edit --default-branch main
gh repo edit --add-topic "machine-learning,python"
gh repo edit --enable-auto-merge
```

With curl: `GET /repos/$OWNER/$REPO` for details, `PATCH` for the settings above (`has_wiki`, `has_issues`, `allow_auto_merge`), and `PUT /repos/$OWNER/$REPO/topics` with `Accept: application/vnd.github.mercy-preview+json` for topics.

## 5. Branch protection

```bash
curl -s -H "Authorization: token ***" \
  https://api.github.com/repos/$OWNER/$REPO/branches/main/protection

curl -s -X PUT -H "Authorization: token ***" \
  https://api.github.com/repos/$OWNER/$REPO/branches/main/protection \
  -d '{
    "required_status_checks": {"strict": true, "contexts": ["ci/test", "ci/lint"]},
    "enforce_admins": false,
    "required_pull_request_reviews": {"required_approving_review_count": 1},
    "restrictions": null
  }'
```

A repository governed by rulesets answers 404 here — that endpoint is classic protection only. Read the ruleset with `gh api repos/$OWNER/$REPO/rulesets/<id>`.

## 6. Secrets

```bash
gh secret set API_KEY --body "your-secret-value"
gh secret set SSH_KEY < ~/.ssh/id_rsa
gh secret list
gh secret delete API_KEY
```

The API needs libsodium encryption with the repo's public key (PyNaCl) — involved enough that installing `gh` for this one operation is the better answer.

## 7. Releases

```bash
gh release create v1.0.0 --title "v1.0.0" --generate-notes
gh release create v2.0.0-rc1 --draft --prerelease --generate-notes
gh release create v1.0.0 ./dist/binary --title "v1.0.0" --notes "Release notes"
gh release list
gh release download v1.0.0 --dir ./downloads
```

With curl: `POST /repos/$OWNER/$REPO/releases` with `tag_name`, `name`, `body`, `draft`, `prerelease`, `generate_release_notes`; assets go to `POST https://uploads.github.com/repos/$OWNER/$REPO/releases/$RELEASE_ID/assets?name=binary-amd64` with `Content-Type: application/octet-stream` and `--data-binary @./dist/binary-amd64`.

## 8. Actions workflows

```bash
gh workflow list
gh run list --limit 10
gh run view <RUN_ID> --log-failed
gh run rerun <RUN_ID> --failed
gh workflow run ci.yml --ref main
gh workflow run deploy.yml -f environment=staging
```

With curl: `GET /repos/$OWNER/$REPO/actions/workflows` to list, `POST .../actions/runs/$RUN_ID/rerun` (or `/rerun-failed-jobs`), `POST .../actions/workflows/<id>/dispatches` with `{"ref": "main", "inputs": {...}}`. Failed logs come back as a zip: `curl -sL .../actions/runs/$RUN_ID/logs -o ~/.hermes/cache/scratch/ci-logs.zip`.

## 9. Gists

```bash
gh gist create script.py --public --desc "Useful script"
gh gist list
```

With curl: `POST /gists` with `description`, `public` and `files`.

## 10. Rolling out a policy across an organisation

Use when every repository must gain the same file, workflow or setting.

1. Enumerate the repositories from the organisation, not from memory: `gh repo list <org> --limit 100 --json name,defaultBranchRef,isPrivate`.
2. Clone each shallow and inventory what exists before deciding: `find repo/.github/workflows -type f`, then grep for references to the old name.
3. Choose one move per repository: rename the workflow that already runs the checks, or add the missing one. Do not leave a second parallel check workflow beside the existing one.
4. Update every reference in the same PR: `grep -rn 'old-name\|old-file.yml' --exclude-dir=.git .` — `AGENTS.md`, `README.md`, `PRODUCT.md` and scripts name workflows more often than the workflows directory does.
5. If the organisation keeps policy in a `.github` repository, change the policy document and its enforcement script together. A rule in prose that no script checks is a suggestion; the script's docstring says which document it encodes.
6. One branch and one PR per repository, each body saying what changed and what was verified; cross-reference the policy PR so reviewers see the rule and the instances.
7. Request the reviewer the repository's `AGENTS.md` names. Do not merge policy PRs when the ruleset requires an approval you cannot give; hand over the links.
8. After the merges, run the enforcement script against the organisation and confirm every repository reports the new rule as satisfied.

## Quick reference

| Action | gh | git + curl |
| --- | --- | --- |
| Clone | `gh repo clone o/r` | `git clone https://github.com/o/r.git` |
| Create repo | `gh repo create name --public` | `curl POST /user/repos` |
| Fork | `gh repo fork o/r --clone` | `curl POST /repos/o/r/forks` + `git clone` |
| Repo info | `gh repo view o/r` | `curl GET /repos/o/r` |
| Edit settings | `gh repo edit --...` | `curl PATCH /repos/o/r` |
| Create release | `gh release create v1.0` | `curl POST /repos/o/r/releases` |
| List workflows | `gh workflow list` | `curl GET /repos/o/r/actions/workflows` |
| Rerun CI | `gh run rerun ID` | `curl POST /repos/o/r/actions/runs/ID/rerun` |
| Set secret | `gh secret set KEY` | `curl PUT /repos/o/r/actions/secrets/KEY` (+ encryption) |
