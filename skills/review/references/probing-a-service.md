# Probing a service

For a change that ships a running thing: a binary, a webhook, a socket API, a client. The gate proves the packages; this proves the thing the operator is about to switch on.

## Pin, build, boot

- Work in a worktree at the head sha: `git worktree add --detach <scratch>/<task> <sha>`, and run the gate there. A shared clone moves under you.
- Run `git worktree list` first and leave the command unpiped. `2>&1 | tail` reports `tail`'s status, so a failed create does not stop a `&&` chain and the gate runs wherever the `cd` landed. A path that already exists may be another session's worktree at the sha you want; reuse it.
- Build the real binary (`go build -o <scratch>/bin/<name> ./cmd/<name>`) and run it on a **copy** of the example config with `--db`/`--socket` at scratch paths.
- Generate a scratch credential **under the scratch directory**, never at a path the config or the deployment names. An App key at `~/.dispatch/app.pem` is the real key's path, and a fake left there becomes the key the service boots with. Check the directory's mtime before `mkdir -p`; if you created it, delete it.
- Confirm the documented boot failures one at a time and keep the messages: no secret, no key, port or socket already held. A process that starts with a missing credential is the first finding.

## Exercise the failure branches

Post to each entry point and record the status code beside the line that claims it. The cases: unsigned request, wrong signature, unparseable body, an unserved delivery, the wrong method. A handler that answers 500 where the document says 202 hides a broken parse.

Sign the exact bytes:

```sh
sig=$(openssl dgst -sha256 -hmac "$secret" -hex < body.json | sed 's/^.*= //')
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$url" \
  -H "X-GitHub-Event: pull_request" -H "X-GitHub-Delivery: d-1" \
  -H "X-Hub-Signature-256: sha256=$sig" --data-binary @body.json
```

Send the same delivery id twice: the second must start nothing. Then read the outcome back through the service's own clients, not the database file.

## Read it back through the clients

- Every documented client command, plus its documented exit codes (not found, no socket, bad reply).
- The web client on its own port and socket variable; fetch each route and read the rendered text, not the JavaScript bundle. Fetch a missing job and an empty record too.
- To count a process's open connections, read `/proc/<pid>/fd`: run a few clients that disconnect, then compare. A proxy that leaks the upstream shows a count that only grows.

## When it answers before the work

- A reply sent before the work makes the service its owner: find where the accepted item is held, and whether a restart resumes it.
- An in-memory queue behind the reply breaks any contract that state lives in the record. A stop loses accepted items, and a failed apply leaves nothing to retry.
- Probe it: send one item whose apply fails, then read the surface a supervisor reads. An answer that reports clean after a failed apply is the finding.
- Name the fix as a mechanism, not a stricter log. Write the accepted row before the reply, apply from that row, and let the retry read it.
- The row a replay applies carries every field the apply reads. Diff the struct the handler parses against the row it writes. A merged close replayed without its merge flag applies as an unmerged close, writing `blocked` and `failed` on a landed pull request.

## Leave the machine as you found it

- Stop every process you started **by PID**. `pkill -f <pattern>` also matches the shell whose command line carries the pattern, so the command dies with its targets. Use `pgrep -af <pattern>`, then `kill <pid>` for the real ones.
- Delete scratch keys, records, logs, the throwaway test file and any directory you created on a shared path. `git status --porcelain` empty is part of the evidence. A side effect on a host path is reported, not silently cleaned.
