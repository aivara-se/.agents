# GitHub Actions workflows

For authoring, folding or reviewing CI/release workflows. Read every file in `.github/workflows/` first: triggers, the job graph and the action majors (`actions/checkout@v7` beside a template's `@v4`) are the repository's cadence, not yours.

## Before the push

- `actionlint .github/workflows/*.yml` (in this sandbox `/root/go/bin/actionlint`). It validates the YAML, every `needs:` target and every `${{ }}` expression. `bun fmt` and `bun test` never read a workflow, and no CI job runs the release workflow on a pull request. Exit 0 prints nothing.
- Read the job graph back from the file after editing:

  ```sh
  sed -n '/^jobs:/,$p' .github/workflows/publish.yml | grep -E '^  [a-z]|needs:|if:'
  ```

## Folding a deploy into a release

When a standalone deploy workflow becomes another platform of the release:

- Keep one **gate job** (`meta`) exporting a `build` boolean. Every platform job takes `needs: <gate>` and the same `if:` on that output.
- The release job's `needs` names every platform. A platform omitted there publishes a release with a missing artifact; only the named ones gate the tag.
- The publish/deploy step takes `needs: [gate, release]`, so the site never moves ahead of the release it belongs to.
- One trigger and one `concurrency` group replace two (`cancel-in-progress: false`).
- A `paths:` filter on the old deploy disappears: that platform now builds whenever the release does, so a change to it alone ships at the next version bump. Write that consequence in the PR body and the ADR, and name any change already merged that will wait.

## Permissions and artifacts

- **Job-level `permissions:` replaces the workflow block, not merges with it.** A job that checks out and also deploys must re-add `contents: read` beside `pages: write` and `id-token: write`, or the checkout has no token.
- `actions/upload-pages-artifact` uploads an artifact named `github-pages`. A release job running `actions/download-artifact` with no filter pulls that tarball in and attaches it to the release. Download by `pattern:` or `name:`, and comment why the Pages artifact is excluded.
- The Pages artifact has a short retention (a day). A failed deploy can be re-run from its run only while the artifact lives; after that the next release is the durable fix. Say so in the ADR instead of implying a retry always works.

## What a branch cannot prove

- `workflow_dispatch` resolves only from the default branch. A `push: branches: [main]` workflow cannot be exercised by a PR branch, and a release gate whose version is already tagged takes the `build=false` path — the merge commit then runs nothing at all.
- In that case report `actionlint` and the read-back graph, say **not run**, and name the first live run. Never present the workflow as exercised because the PR's `validate` check is green.
- Open it as a draft (`gh pr create --draft`) when the pipeline cannot be proven before merge, and say in the body which fact is unproven.
