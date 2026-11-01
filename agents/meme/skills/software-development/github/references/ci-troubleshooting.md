# CI Troubleshooting

Read a failed run before you change code: start at the file and line the log names.

## Reading logs

```bash
gh run view <RUN_ID> --log-failed

# With curl — download and extract
curl -sL -H "Authorization: token ***" \
  https://api.github.com/repos/$GH_OWNER/$GH_REPO/actions/runs/<RUN_ID>/logs \
  -o ~/.hermes/cache/scratch/ci-logs.zip && unzip -o ~/.hermes/cache/scratch/ci-logs.zip -d ~/.hermes/cache/scratch/ci-logs
```

## Failure patterns

| Kind | Signature | Fix |
| --- | --- | --- |
| Test | `FAILED tests/test_foo.py::test_bar - AssertionError`, `E assert 42 == 43` | Fix the logic or the stale assertion. |
| Test | `ModuleNotFoundError`; a test that flakes | Add the dependency to `requirements.txt` / `pyproject.toml`; retry, mock the external call, or fix the race. |
| Lint / format | `E302 expected 2 blank lines`, `would reformat src/utils.py` | Run the formatter: `black .`, `isort .`, `ruff check --fix .`. Under `patch`, match the existing indentation. |
| Types | `incompatible type "str"; expected "int"`, `Missing return statement` | Convert or cast, or fix the signature. `# type: ignore` is the last resort and needs a comment. |
| Build / Docker | `Could not find a version that satisfies the requirement foo==1.2.3`, `COPY failed: file not found in build context` | Add or pin the dependency, update the lockfile, compare the local runtime version with CI's; fix the copy path or the base image tag. |
| Permission | `could not read Username for 'https://github.com'`, `Resource not accessible by integration`, `403 Forbidden` | Add a `permissions:` block; check the secret exists (`gh secret list`). Fork PRs get no secrets by design. |
| Timeout | `The operation was canceled.`, `has exceeded the maximum execution time` | Add `timeout-minutes`, fix the slow call, or split the job. |

## The aggregate check disagrees with the run

`gh pr checks <n>` reads the check-suite record, which can lag the run or flip back to `queued`/`in_progress` after the job finished. Do not report the PR as pending on that alone:

```bash
gh run list --limit 3 --json databaseId,status,conclusion,headSha
gh run view <run-id> --json status,conclusion
gh api repos/{owner}/{repo}/commits/<sha>/check-runs --jq '.check_runs[] | [.name,.status,.conclusion]'
```

Report what the run itself says (`completed`/`success`), name the aggregate as lagging, and re-read once after a minute instead of polling the same stale number.

## Check identity: workflow name, job name, required check

A pull request is judged by the **check run's name**, which is the job's `name` (the job key when it has none) — not the file's name and not the workflow's top-level `name:`. Rename the file and leave the job alone and the required check goes absent while the gate still runs.

- A repository's gate is one workflow named `validate`, with a job named `validate`, in `.github/workflows/validate.yml`. For aivara-se that is the baseline written in `docs/SETTINGS.md` of `aivara-se/.github`; read it there rather than inferring the shape from a sibling repository.
- A rename is three names in one commit — the path (`git mv`, so the diff stays a rename of two lines), the top-level `name:`, and the job key.
- Prove it on a real run, not with a YAML parse: push the branch, then read

```bash
gh run list --branch <branch> --limit 3
gh run view <run-id> --json name,jobs | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['name'], [(j['name'], j['conclusion']) for j in d['jobs']])"
```

The two names it prints are what GitHub reports as the check. Old runs keep the old name in a pull request's history; a rename does not rewrite them.

- Before promising that a rename unblocks a merge, read the ruleset — the required-check rule may not exist on that repository at all:

```bash
gh api repos/{owner}/{repo}/rulesets          # ids
gh api repos/{owner}/{repo}/rulesets/<id> | python3 -c "import json,sys; d=json.load(sys.stdin); print([r['type'] for r in d['rules']])"
```

`required_status_checks` absent means the new name is right and still unenforced. Settings are not code: name the gap in the pull request body, do not try to change it from a branch.

- A `paths` filter on the trigger leaves the required check pending rather than skipped, so a pull request that does not match never merges; a job skipped by an `if:` reports success.
