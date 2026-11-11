<!-- Self-contained: the recipient reads no thread. Fill every <angle> and delete this comment. -->

# Task: <setting> for <org>/<repo>

You have admin access to the GitHub organisation `<org>`. Make the changes below, verify them, and report the API output. Change nothing else.

## Rules

- Use `gh` authenticated as an owner. Never print or echo the token.
- Make no commits, no branch pushes, no issue or pull request edits. This task is settings only.
- Run one step at a time. On `403`, `404` or `422`, stop and report the exact response. Do not retry with another method or a wider permission.
- Call a step done only when its verification command prints the expected value.

## Context

<What the repository is, the value each setting holds now, the intended value, and the commit or run that proves the rest of the state.>

## Steps

1. Record the starting state:

```bash
<read command>
```

2. Apply the change:

```bash
<write command, with the full body inline>
```

3. Run the pipeline once and wait for it:

```bash
<dispatch or rerun command>
<status command>
```

4. Verify each claim:

```bash
<query>   # expects <value>
<probe>   # expects <status>
```

5. Confirm nothing else moved:

```bash
<query on the settings that must be untouched>
```

## Do not change

<Settings already correct, other repositories, and the branch content. Say whether the audit of the rest is read-only.>

## Report

Reply with: the value before and after, the run URL, each verification result, and every step that failed with its response body. Name any repository that differs from the baseline.
