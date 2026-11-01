# Verifying a merge

## Prove a rebase merge landed what was reviewed

The baseline is rebase-only, so a merge rewrites every hash — compare trees, not commits.

```sh
git fetch --prune
gh pr view <n> --json mergeCommit --jq .mergeCommit.oid   # the commit now on main
git rev-parse <reviewed-head>^{tree}                      # the head the approval was given for
git rev-parse <merge-commit>^{tree}
```

Equal trees mean the reviewed content is what merged. Then read the base branch for the symbol the change adds:

```sh
git log --oneline -3 origin/main
git show origin/main:<touched-file> | grep -n <symbol-the-change-added>
```

## Post-merge cleanup

```sh
git checkout main && git pull --ff-only origin main
git branch -D <merged-branch>     # local only — the host deletes the head branch on merge
git fetch --prune
git status --short                # must print nothing
```

The merge closes the issue and project automation sets `Finished`; never move the column by hand. Read both back:

```sh
gh issue view <n> --json state,closedAt,stateReason
gh api graphql -f query='{ repository(owner:"aivara-se", name:"<repo>"){ issue(number:<n>){ state projectItems(first:5){ nodes{ fieldValueByName(name:"Status"){ ... on ProjectV2ItemFieldSingleSelectValue { name } } } } } } }'
```

## Count a conflict between two open pull requests

The merger orders the pair, so measure on both heads as they stand.

```sh
git worktree add --detach /root/scratch/<name> <head-A>
cd /root/scratch/<name>
git merge --no-commit --no-ff <head-B>       # names the conflicted files
git diff --name-only --diff-filter=U
grep -c '^<<<<<<<' <file>
git merge --abort
```

Then `git worktree remove --force <dir>`, `git worktree prune`, and remove the scratch directory. Quote the count with the two heads it was measured on.

## When mergeability reads `unknown`

`null` / `unknown` is a recompute in flight after a push or merge. Poll a few times; if it stays, read `state` + `merged` + `mergedAt` — the pull request may already have merged.
