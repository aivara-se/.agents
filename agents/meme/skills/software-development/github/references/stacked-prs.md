# Stacked pull requests: the official `gh stack` extension

GitHub supports stacks natively (public preview). The extension is `github/gh-stack`;
the CLI inside `gh` only advertises it. Always confirm it is installed before use:

```bash
gh extension install github/gh-stack   # idempotent-ish; says "already installed" otherwise
gh stack view --short                  # fails readably when not in a stack
```

Prefer it over the hand-managed stack in `pr-workflow.md` §8. That section still applies
where the extension cannot be used (fork-based stacks, a repo with stacks disabled, an
external tool that owns the branches — then `gh stack link` bridges them).

## Model

```
main ← feat/auth-layer (#1) ← feat/api-routes (#2) ← feat/ui (#3)
```

The bottom PR targets the trunk; each higher PR targets the branch below it, so its diff is
only its own layer. GitHub enforces the trunk's branch protection on every layer, runs

## Local workflow

```bash
gh stack init auth-layer api-routes ui-components   # new or existing branches, bottom→top
gh stack init --base develop my-feature             # non-default trunk
gh stack add my-feature                             # new branch on top of current
gh stack add -Am "Add login" my-feature              # and commit staged+untracked
gh stack add -m "Fix login bug"                      # branch name generated from the message
gh stack up|down [n] | bottom | top | trunk | switch  # move around
gh stack view [--short|--json]                       # status: ✓ merged ◎ queued ○ open ⚠ needs rebase
```

State lives in `.git/gh-stack` (JSON: trunk SHA, one `base` SHA per branch) plus
`.git/gh-stack.lock`; it is per-clone, not shared. Do not hand-edit it — `gh stack init`
adopts branches, so a corrupt file is fixed by re-initialising.

## Submit

```bash
gh stack submit            # interactive editor: pick branches, title/body, draft toggle
gh stack submit --auto     # no editor; NEW PRs ARE CREATED AS DRAFTS
gh stack submit --auto --open  # create/update and mark ready for review
```

It pushes every branch, creates PRs, fixes each base, then creates or updates the **stack
object** — a repository-level id (`stack #4`) that is independent of PR numbers, visible at
`gh api repos/{owner}/{repo}/stacks`. Verified: `--auto` alone left all three PRs draft, and
the stack existed immediately, so a later `gh stack merge` fails on drafts until `--open`.

## Keeping the stack linear

- A commit on a **lower** branch makes every branch above it stale: `gh stack view` shows
  `⚠ needs rebase` on the children, not on the edited branch.
- `gh stack rebase` fetches trunk, then cascade-rebases bottom→top
  (`--downstack` / `--upstack` / `--no-trunk` / `--continue` / `--abort`).
- `gh stack push` pushes with per-branch `--force-with-lease` (not atomic).
- `gh stack sync` does the whole loop in one step: fetch, reconcile with GitHub (pulls down
down branches for PRs added remotely), fast-forward trunk, cascade rebase, atomic
  force-with-lease push, sync PR state, relink the stack. On conflict it restores every
  branch and tells you to run `gh stack rebase`; `--prune` drops branches of merged PRs.

**A cascade rebase rewrites the children even when nothing conflicts** — every branch above
the edited one gets a new SHA, which dismisses its approvals. After `gh stack push`, re-request
review on the layers that moved.

## Merging

```bash
gh stack merge --yes --squash      # whole current stack, no prompt
gh stack merge 42                  # everything up to and including PR #42
gh stack merge 7                   # a stack you do not have checked out (stack number)
```

Atomic: all PRs up to your choice merge or none do, bottom-up, and the history is identical
to merging each PR separately. Verified with three layers: `--squash` produced one squash
commit per PR (`feat: add auth layer (#1)`, …). Merge-queue aware; bypassing merge
requirements is not supported. Only open/non-draft is checked locally — branch protection is
evaluated by GitHub at merge time and the failure comes back to you.

A PR listed with `baseRefName` pointing at the branch below keeps that value in
`gh pr list` after merging; read `state`/`mergedAt` for the truth.

## Restructuring

```bash
gh stack modify            # TUI: drop, fold, insert, reorder, rename; applies on Ctrl+S
gh stack modify --continue|--abort
gh stack checkout [<stack>|<pr>|<url>|<branch>]
gh stack link <branch-or-pr>...   # build a stack from foreign branches/PRs, bottom→top
gh stack link 7 48 ui-polish      # append to an existing stack by number
gh stack unstack [--local]        # dissolve; queued/auto-merge PRs stay stacked
```

`modify` needs a clean tree, an active stack, linear history, no rebase in progress and no PR
queued; it works in each branch's own worktree and never stashes.

## Failure modes worth knowing before you promise a merge

- Rules, CODEOWNERS and the trunk's CI apply to **every** layer, so a stack is not a way to
  skip review; the extension does not bypass them.
- Closing a PR mid-stack blocks everything above it: dissolve the stack, then recreate.
- Removing a PR from the merge queue ejects the ones above it too.
- A merge that fails partway leaves the lower PRs landed and the rest open; fix the failed PR
  and retry.
- Cross-fork stacks are unsupported; branch-argument linking pushes branches first.
- `gh stack init` on a dirty tree adopts whatever the branches point at — commit before you
  start, or the stack's story is the uncommitted mess.
