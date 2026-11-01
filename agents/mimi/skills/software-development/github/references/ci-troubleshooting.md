# CI Troubleshooting

## Read the logs

```bash
gh run view <RUN_ID> --log-failed

# Without gh, the logs endpoint returns a zip
curl -sL -H "Authorization: token ***" \
  https://api.github.com/repos/$GH_OWNER/$GH_REPO/actions/runs/<RUN_ID>/logs \
  -o ~/.hermes/cache/scratch/ci-logs.zip && unzip -o ~/.hermes/cache/scratch/ci-logs.zip -d ~/.hermes/cache/scratch/ci-logs
```

## Failure patterns

| Pattern | Signature in the log | Fix |
| --- | --- | --- |
| **Test** | `FAILED tests/test_foo.py::test_bar - AssertionError`, `assert 42 == 43` | Read the failing test: stale assertion or logic error. Fix whichever is wrong. |
|  | `ModuleNotFoundError` | A dependency missing in CI — add it to `requirements.txt` / `pyproject.toml`. |
|  | flaky test | Add a retry, mock the external service, fix the race. |
| **Lint / format** | `E302 expected 2 blank lines`, `E501 line too long`, `error: would reformat` | Identify the linter (flake8, ruff, black, isort), then `black .`, `isort .`, `ruff check --fix .`, or edit to match the file's indentation. |
| **Type check** | `Argument 1 to "process" has incompatible type "str"; expected "int"`, `Missing return statement` | Cast or convert, or fix the signature. `# type: ignore` only as a last resort, with an explanation. |
| **Build** | `No module named 'some_package'`, `Could not find a version that satisfies the requirement foo==1.2.3`, `npm ERR! Could not resolve dependency` | Add the dependency, pin a compatible version, update the lockfile; compare local and CI runtime versions. |
| **Permission / auth** | `could not read Username for 'https://github.com'`, `Resource not accessible by integration`, `403 Forbidden` | Add a `permissions:` block to the workflow; confirm the secret exists (`gh secret list`). Fork PRs get no secrets, by design. |
| **Timeout** | `The operation was canceled.`, `has exceeded the maximum execution time` | Find the hung step: loops, slow network. Set `timeout-minutes: 10` or split into parallel jobs. |
| **Docker** | `COPY failed: file not found in build context`, `failed to solve` | Fix the `COPY`/`ADD` path, the base image tag, or the `.dockerignore`. |

Permission errors and real timeouts usually need the user; fix the rest.

## Workflow inventory and renames

- `GET /repos/{o}/{r}/actions/workflows` lists workflows registered from any branch, not only the default branch: a workflow deleted from `main` can still appear. To prove a workflow exists where it ships, list `.github/workflows` at `ref=<default_branch>` and read each file's `name:` line.
- A `workflow_dispatch`-only workflow produces no check run on a pull request. An all-green PR is not evidence that it ran; dispatch it explicitly or say that it did not run.
- Renaming a workflow renames its check run. Rename the file and the `name:` together, then grep the whole repository for both the old filename and the old display name — `AGENTS.md`, `README.md`, `PRODUCT.md` and scripts name workflows more often than the workflows directory does. If a required status check or branch-protection rule names the old check, update it in the same change.
- When the workflow is templated, update the template's adoption steps in the same change, or every adopter copies a file the instructions never mention.
- `actions/setup-go` with `go-version-file: go.mod` fails with "The specified go version file at: go.mod does not exist" in a repository whose module has not landed. Pin `go-version` until `go.mod` exists, or gate the job on the file.
- Validate workflow YAML before pushing when PyYAML is unavailable:

  ```bash
  bun -e 'Bun.YAML.parse(await Bun.file(process.argv[1]).text())' .github/workflows/validate.yml
  ```

## Fix and re-run

Re-check the head commit after the push:

```bash
gh pr checks --watch 2>/dev/null || \
  echo "Poll with: curl -s -H 'Authorization: token ***' https://api.github.com/repos/.../commits/$(git rev-parse HEAD)/status"
```
