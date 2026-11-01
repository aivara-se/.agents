# Stacked pull requests: the official `gh stack` extension

Stacks are native on GitHub (public preview) via the `github/gh-stack` extension, which `gh` only advertises. Confirm it is installed:

```bash
gh extension install github/gh-stack   # idempotent-ish; says "already installed" otherwise
gh stack view --short                  # fails readably when not in a stack
```

Prefer it to the hand-managed stack in `pr-workflow.md` §8, which still covers fork-based stacks, a repo with stacks disabled, and an external branch owner (`gh stack link` bridges them). Each PR targets the branch below, so its diff is its own layer; trunk protection covers every layer.

## Local workflow

```bash
gh stack init auth-layer api-routes ui-components   # new or existing branches, bottom→top
gh stack init --base develop my-feature             # non-default trunk
gh stack add my-feature                             # new branch on top of current
gh stack view [--short|--json]                       # status: ✓ merged ◎ queued ○ open ⚠ needs rebase
```

State lives in `.git/gh-stack` (trunk SHA, one `base` per branch) and `.git/gh-stack.lock`, per clone. Do not hand-edit: `gh stack init` adopts branches, so re-initialising fixes a corrupt file.

## Submit

```bash
gh stack submit            # interactive editor: pick branches, title/body, draft toggle
gh stack submit --auto     # no editor; NEW PRs ARE CREATED AS DRAFTS
gh stack submit --auto --open  # create/update and mark ready for review
```

Submit pushes every branch, creates PRs, fixes each base, then the **stack object**: a repository id (`stack #4`) independent of PR numbers, at `gh api repos/{owner}/{repo}/stacks`. `--auto` alone leaves every PR a draft, so `gh stack merge` fails until `--open`.

## Keeping the stack linear

- A commit on a **lower** branch stales those above it: `gh stack view` shows `⚠ needs rebase` on the children, not the edited branch.
- `gh stack rebase` fetches trunk, then cascade-rebases bottom→top (`--downstack` / `--upstack` / `--no-trunk` / `--continue` / `--abort`).
- `gh stack push` uses per-branch `--force-with-lease`, not atomic. `gh stack sync` runs the loop — fetch, reconcile, cascade, push, relink — restores all branches on conflict, asking for `gh stack rebase`; `--prune` drops merged branches.

**A cascade rebase rewrites children even without conflicts**: new SHAs dismiss approvals, so re-request review on the layers that moved.

## Editing a layer

- `gh pr edit <n> --body-file … --add-reviewer …` touches only the PR; the stack link and every base survive. `--auto --open` seeded the body from the commit message: replace it.
- To change a lower layer: amend its commit, then `gh stack rebase --no-trunk` and `gh stack push`.
- A fix approved on a head a rebase replaced is not on the branch: check `git cat-file -t <sha>`, cherry-pick it before the rebase, ask again.
- A test added at the bottom changes every upper layer's count; re-run the gate per head before quoting one.
- Check every layer with `gh pr checks <n>`: a green top does not prove a green middle.

## Merging

```bash
gh stack merge --yes --squash      # whole current stack, no prompt
gh stack merge 42                  # everything up to and including PR #42
```

Atomic: every PR up to your choice merges or none does, bottom-up, history identical to separate merges. Merge-queue aware; merge requirements cannot be bypassed. Only open/non-draft is checked locally — GitHub evaluates protection at merge time. A merged PR's `baseRefName` still points below it: read `state`/`mergedAt`.

## Restructuring

`gh stack modify` is a TUI (drop, fold, insert, reorder, rename; needs a clean tree, linear history, no rebase running and no queued PR, and never stashes) with `--continue`/`--abort`. `gh stack checkout [<stack>|<pr>|<url>|<branch>]` moves to a stack; `gh stack link <branch-or-pr>...` builds one from foreign branches, bottom→top; `gh stack unstack [--local]` dissolves it, and queued PRs stay stacked.

## Failure modes

- Rules, CODEOWNERS and trunk CI apply to **every** layer: a stack does not skip review.
- Closing a PR mid-stack blocks everything above it; dissolve and recreate.
- Removing a PR from the merge queue ejects the ones above it.
- A merge that fails partway lands the lower PRs and leaves the rest open; fix and retry.
- `gh stack init` on a dirty tree adopts whatever the branches point at — commit first.
