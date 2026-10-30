# Probing GitHub's webhook behaviour

Use when a design, an integration or a config turns on a question the prose docs do not answer: *does GitHub send this action when that happens, and what fields does the payload carry?* The docs list actions and properties; they rarely state the trigger condition, and a wrong guess becomes a branch that never fires or a double wake.

## Answer payload shape from the schema, not the page

The webhook page is one huge JS-rendered document and its tables omit nested array item shapes. The octokit schemas are plain JSON and complete:

```sh
curl -sS "https://raw.githubusercontent.com/octokit/webhooks/main/payload-schemas/api.github.com/<event>/<action>.schema.json"      # the delivery
curl -sS "https://raw.githubusercontent.com/octokit/webhooks/main/payload-schemas/api.github.com/common/<object>.schema.json"        # a $ref'd object
```

Event payloads `$ref` shared objects (`common/pull-request.schema.json`, `common/issue.schema.json`, `common/repository.schema.json`), so a field the event schema appears not to have usually lives one ref down. `payload-examples/api.github.com/<event>/<action>.payload.json` gives a filled example when a shape is still unclear.

## Answer delivery behaviour by observing it

A hook pointing at an unreachable URL still records every delivery, so the probe needs nothing listening and no tunnel:

```sh
REPO=<owner>/<repo>          # a repository you administer: hooks need admin
HOOK=$(gh api -X POST "repos/$REPO/hooks" -f name=probe -F active=true \
  -f 'events[]=issues' -f 'events[]=pull_request' -f 'events[]=issue_comment' -f 'events[]=workflow_run' \
  -f 'config[url]=https://example.invalid/probe' -f 'config[content_type]=json' \
  -f 'config[secret]=throwaway-probe' --jq .id)

# perform the exact gesture the question is about, then:
gh api "repos/$REPO/hooks/$HOOK/deliveries" --jq '.[] | [.id,.event,.action,.status] | @tsv'
gh api -X DELETE "repos/$REPO/hooks/$HOOK"
```

- **Do the gesture, not a paraphrase.** "Create an issue with an assignee" and "create an issue, then assign it" are different experiments; run the one the design will meet.
- **One hook answers several questions in a pass** — subscribe to every event the design touches, then perform a run of gestures.
- **Sort by `id` for order.** The list is newest first, and two deliveries from one gesture arrive in a meaningful sequence.
- **A failed status is fine.** `failed to connect to host` is recorded exactly like a delivered one; the event, action and payload are what the probe is for.
- **Clean up and say so.** Delete the hook, close the probe issue or pull request, and report that you did.

## Findings worth starting from

- An issue **created with an assignee** delivers `issues` `opened` then `issues` `assigned`; a pull request created with an assignee does the same on `pull_request`. The `opened` delivery is not the assignment — acting on it double-wakes. Re-probe if a design comes to rest on it.
- `workflow_run.pull_requests[]` carries `number`, `head` and `base` only — no author — and the run's `actor` is the account that triggered it. `repository.default_branch` and `workflow_run.head_branch` are both present, so "a failure on the default branch" is decidable from the payload.
- `issue_comment` carries `comment.body`, `comment.author_association` (`OWNER`, `MEMBER`, `COLLABORATOR`, `CONTRIBUTOR`, `NONE`, …) and `issue.pull_request` when the issue is a pull request — enough to gate a wake on trust without an API call.
- `pull_request.auto_merge` is an object when auto-merge is armed and `null` when not; `draft` and `state` sit beside it. Approval-plus-not-armed is therefore a payload-only question.

## Pitfalls

- **A docs page that names an action does not say when it fires.** Treat "the docs mention it" as necessary, not sufficient: probe the trigger before writing a product sentence about it.
- **A hook on a repository needs admin rights** (`viewerPermission: ADMIN`); an organisation hook needs `admin:org_hook`, which the usual tokens lack. Probe on a repository you own instead.
- **Never leave the probe behind.** A live hook on a real repository keeps receiving deliveries and is invisible to everyone but you.
