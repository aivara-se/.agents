# Issues

Create, assign and read back an issue with `gh`. The body is the specification a builder works from, so it follows the message rules in `writing`: what, why, acceptance, out of scope.

## Create

```sh
gh issue create --repo O/R --title "v1.14: <the change>" --body-file /tmp/body.md \
  --assignee <login> --label enhancement
```

- It prints the URL only. The number is the last path segment; read it from the URL.
- Assignable logins: `gh api repos/O/R/assignees --jq '.[].login'`. An assignee is a claim: the field writes, and the run it starts is a separate fact.
- Read back what was written: `gh issue view <n> --json number,title,state,assignees,labels,milestone`.

## Links in a body

- **A relative link does not resolve from the repository root.** `docs/x.md` lands under `/O/R/issues/docs/x.md` and 404s. Write `https://github.com/O/R/blob/main/docs/x.md`.
- A file the pull request under review adds is not on `main` yet. Link the pull request, or accept that the `blob/main` link starts working only at the merge.

## Dependencies

- `blocked_by` takes the blocker's database id: `gh api --method POST repos/O/R/issues/<blocked>/dependencies/blocked_by -F issue_id=<id>`.
- **A pull request cannot be a blocker.** The call answers `422 Target issue may only be an issue`. State the dependency in the body, with the PR link, and keep the edge for issues.
- Read back: `gh api repos/O/R/issues/<n>/dependencies/blocked_by --jq '.[] | "\(.number) \(.title)"'`.

## Body

- Name the version or the decision in the first line, and link the record in the pull request that carries it.
- Acceptance items must be observable by someone else: a command, a rendered result, a measured time. "Implement X" is not checkable.
- Name the gate and the out-of-scope list, so a builder stops at a blocker instead of deciding it.
