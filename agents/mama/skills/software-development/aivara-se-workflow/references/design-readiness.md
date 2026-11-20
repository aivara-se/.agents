# Is the design ready to build?

A design pass ends with documents that decide the model. A builder needs six contracts; prose that names the model is not one.

## The five contracts

- **The unit of work is frozen.** The queue key, the record's root, the configuration's subject and the client's nouns all derive from it. Every later change rewrites the config shape, the keys and the words on every surface; settle it before a field name exists.
- **Flows belong to the deployment.** The engine ships none; the repository's `config/` is a worked example and the product document says so. Its acceptance states engine outcomes — a job ends in `_done_` or `blocked` — never an example flow's (a review request ends in a merge): a flow is user-side, so an acceptance naming one grades the example, not the product.
- **The configuration has a shape.** Flows, tasks, gates, limits and any concurrency declaration need fields and a closed vocabulary. "A flow declares the tasks that may run together" cannot be compiled. A write the engine makes on its own — the `blocked` label — belongs to an engine action, not a flow field; a sentence naming the write is not a schema. The server's own fields are part of the shape too: the listen address, the webhook path and the environment variable that holds the secret. A builder left to invent them turns deployment settings into flags or hard-codes them.
- **The API has records and calls.** A client built against "JSON over a socket" invents the endpoints. Name what it reads and what it asks for.
- **The conditions are a closed set.** Each condition the engine evaluates needs a predicate it can run and one word that names it in the configuration. Examples in a product document are a builder's guess at the language. State the success rule beside them: only `_done_` is success, every other stop fails, and a closed unmerged pull request ends the job blocked.
- **Every write has an actor after the last task ends.** A closing comment or a hand-off notice fires when no agent is running. Give it to the engine with the narrowest grant, or make it a task. The engine's own write is the `blocked` label, applied by its `label` action; no flow field names it. A rule that assigns a write to a party its own Never list forbids is a contradiction, not a detail.

### Designing the configuration contract

- JSON, short keys, one word per concept — and the word is the product document's. A key that renames a noun the product document already uses is a second vocabulary the builder has to reconcile.
- Answer each turn with the whole file, not a diff: the operator is editing a schema, and a field left out of a partial reply silently keeps the old shape.
- A reserved name is prefixed (`_start_`, `_done_`) so no task can collide with it; the entry carries `next` alone, because a separate `when` repeats the condition `next` already names.
- The condition vocabulary is one closed list in one file, and the loader rejects a key outside it; an example in a product document is a guess at the language. The list states the evaluation order (first match wins), that a closed pull request ends the job without a condition, and that the read which decided a condition is the task's evidence.
- The flow is its file: the file name names the flow and the task names are the keys, so a renamed task is one edit and no second document drifts.
- The job key is the flow's: a pattern in the flow file. The API carries the flow, owner and repo as path segments (`/v1/flows/{flow}/jobs/{owner}/{repo}/{key}`), so the pattern is the last segment alone (`{n}`); a key that repeats the flow or the repository writes the path twice.
- Every rename sweeps every place that names the word in one commit: the JSON keys, the prose, the reference document that defines the vocabulary, and the design mock's data strings, renderer fields and printed prompt text. Grep the old word for zero, then grep the repo for the new one to prove each copy moved. A mock whose renderer still reads `t.prompt` after the data became `actions` draws an empty block, not an error.
- The config directory carries a README naming every field and placeholder: JSON has no comments, and a field nothing explains is the builder's guess.
- Write a config file whole and load it (`python3 -c 'import json,sys; json.load(open(sys.argv[1]))' <file>`). JSON has no compiler, and a patch that inserts a field beside a brace can merge two lines into a shape no loader accepts.
- A mock's sample jobs are a worked example of the rules, not decoration. After a rule change, re-derive each story — why it stopped, which agent acted, what the condition read — and render the page to confirm it draws; a mock that contradicts the flow teaches the builder the wrong behaviour.
- **The agent belongs to the action, not the task.** A task is a list of actions run in order: a `prompt` carries `agent` and `text`, a `script` carries `path` and `args`, an engine `action` carries `name` and `value`. Only a prompt reaches an agent; the engine runs scripts and actions. Every action must exit zero and nothing is checked between them, so the task's condition is read once, after the list. A task is a run of actions, not a session: the job key titles the thread a prompt resumes, so tasks of one job and profile share it. An action's output is the record, not a comment; the agent decides whether to comment, and the product document says "may comment". An `agent` left on the task duplicates the prompt's and goes stale the moment a task mixes a script with a prompt.
- **A template variable is a field.** List every `{...}` the config uses and confirm the shape defines it: `{n}` is the key's last segment, `{pr.url}` the pull request's URL. One brace style across keys and prompts — a second (`{{...}}`) is a syntax nothing renders, and an undefined placeholder reaches the agent literally.
- **A contract the builder is held to is an ADR.** The condition set, the API and the adapter belong in `docs/adrs/`, not a topical `docs/<name>.md`: the operator replaced three such files with records. Keep the schema in the config README and the why in the ADR; a topic file is prose beside the record, and an ADR is what a later change cites and supersedes.
- `limit` sits on the task it limits and is required, with `turn` (that task's starts) and `time` (the task's whole budget, in seconds; the engine kills the running action when it expires). An optional limit leaves the task the adapter must kill with no deadline; a review loop stops at its turn count without capping its neighbours.
- The prompt states the task, never the identity. A "You are X" opening duplicates the prompt action's `agent` and goes stale the moment that action is reassigned.
- `next` is the only transition field. Each key is a condition and each value a task, so the read that proves the step is the word that moves it; a separate assert or post field gives one step two names and lets them disagree.
- Name the template and the instance with different words — a flow and the job that runs it. One word for both leaves "the flow stops" with two subjects, and the limit, the record and the client all inherit the ambiguity.

### Designing the API contract

- Read-only: the engine writes, the clients read. A client that can write is a second writer of the record.
- Flows are first-class: `/v1/flows`, then one jobs call per flow, a flow-scoped detail carrying every task's actions and their outputs beside `pc`, evidence and tools, and one change stream the client refetches on. A fourth, health, is for the CLI.
- The list carries card totals and a short task row; the detail carries the full record. A list carrying prompts and evidence is the detail under another name.
- Use one state word on the wire and in the mock's group labels — `started`, `blocked`, `done` — and one success predicate: a job is `passed` only when the flow reached `_done_`, every other ending is `failed`, `pending` while it runs. The task carries the condition it read (`pc`), not a second verdict; one word for two subjects is the confusion the reviewer catches.
- The path carries the key as its own segment beside owner and repo (`/v1/flows/review/jobs/aivara-se/dispatch/212`), so no segment packs a separator and no client encodes one.
- The socket is a file with permissions (`0600`), not a token: a local client reads it or it does not.

### The interfaces beside the API

- **The GitHub App is a contract.** State its permissions — metadata read, pull-request read, issues write, because a pull request's labels are issue labels — and its one write, the `blocked` label applied through the `label` action. No contents, review or merge write: the agent holds those, and a missing permission is a bug, not an accident. The installation selects the repositories; the config's `repos` narrows them.
- **Deliveries are the only trigger; name the events.** `pull_request` (opened, closed) and `pull_request_review` (submitted), with the condition each satisfies. A flow names no event: its `_start_.next` condition implies one, and the App subscribes once to both families. Each flow whose `_start_.next` holds starts its own job for that pull request, and a second delivery waits. A condition read after a task (`pr.updated`) can never start a job. Do not answer a missing wake with a poll: state lives in a local SQLite record, a restart resumes what is unfinished, and a delivery missed while the service is down is not replayed. A delivery names no key, so say how it finds its job — flow, owner and repo, pull request number — and whether the key is rendered at lookup or stored at creation. A lookup that re-renders the pattern misses every job created under an older one.
- **The CLI is a contract too.** The web client is the visual surface, so a TUI duplicates it and stays out. State the read-only commands (`flows`, `jobs`, `show`, `watch`), `--json`, the socket flag and the exit codes.
- **Leave the exact JSON to the builder.** Once the endpoints, nouns, state words and the closed condition set are fixed, the object's field list is implementation; an ADR that pins every key is a second copy to keep true.

## The answer

- Lead with what is missing, not with a verdict on the documents; a model can be settled and still unbuildable.
- Name what can start against a stub — ingress, resolution, the queue, the agent adapter — and which contracts the first slice assumes.
- A design that answers all five can still be wrong about the product; that is a different review.
