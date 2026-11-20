# Exercising the engine

How to run a dispatch build on this machine and drive real deliveries into it. A branch that builds is not a service that works: boot it, sign a delivery, read the record back, and open the client.

## Prepare a tree you own

- Pin the sha you judge into your own worktree under `~/scratch/<agent>/<task>`; a shared clone moves under a review.
- Build the binary out of tree: `go build -o <scratch>/dispatch ./cmd/dispatch`. Keep `TMPDIR`, `GOTMPDIR` and `GOCACHE` under `/root`.
- Copy `config/` into a scratch run directory and edit the copy. Never boot against the repository's example and never against the operator's live config.

## Boot it with nothing real

`--config` names a **directory** holding `dispatch.json` and `flows/`. A path to the JSON file exits `open <file>/dispatch.json: not a directory`. Every key is required: `listen`, `path`, `secret_name`, `app_id`, `key_path`, `repos`, `hermes`, `agents`. `agents` is a map of `{"<name>": {"profile": "<profile>"}}`, and an agent a flow names must be in it. A missing one exits with `unknown agent "<name>"`. The `flows`, `jobs`, `show` and `watch` subcommands belong to the bun client under `cli/`.

The example config names an App key and a secret the machine does not hold. Make a throwaway key, then boot:

```sh
openssl genrsa -out <scratch>/app.pem 2048
DISPATCH_WEBHOOK_SECRET=testsecret ./dispatch --config config \
  --db db.sqlite --socket d.sock
```

- Pass `--db` and `--socket` every time. Their defaults are `~/.dispatch/`, which is the operator's live record. If one run forgets them, remove the stray `~/.dispatch` afterwards so the next real boot starts clean.
- Flags come before any subcommand. Go's `flag` package stops parsing at the first positional argument: `./dispatch flows --config <dir>` ignores the flag and boots the default `config/`.
- Stop the live unit first, and only then: its cgroup holds running Hermes turns and the stop kills them mid-review. Read the children with `systemctl --user status <unit>` before the stop, and name the turns you cut on the thread. A cut review is unwritten, not rejected. Host side: `hermes-fleet-maintenance`, `references/waker-service-upgrade.md`.
- Delete the throwaway key when you are done. Never leave one at a path a deployment config names: a real deployment would read it and fail every App call.
- Read the refusals first: no secret and no key must each exit 1 with one line naming the missing thing. `SYSTEMS.md` says the process stops at boot.

## Sign and send a delivery

HMAC the exact bytes you post, with the same secret:

```sh
sig=$(openssl dgst -sha256 -hmac testsecret -hex < payload.json | sed 's/^.*= //')
curl -X POST http://127.0.0.1:<port>/github \
  -H "X-GitHub-Event: pull_request" \
  -H "X-GitHub-Delivery: d-1" \
  -H "X-Hub-Signature-256: sha256=$sig" \
  --data-binary @payload.json
```

Expected on a served repository: 202 and one job. The same `X-GitHub-Delivery` again: 202, no second job. Bad signature: 401. Body that is not JSON: 400. `GET`: 405. A repository outside `repos`: 202, nothing. A fake App key makes the first GitHub read fail: the job must end `blocked` with the reason on the record, not a crashed server.

## Put a job in the record without GitHub

A throwaway program in the module seeds a job faster than a real App:

- Write `tmpseed/main.go` that calls `record.Open`, `EnsureJob`, `BeginTask`, `BeginAction`, `FinishAction`, `FinishTask`, `SetTask` and `EndJob`, then run `go run ./tmpseed <db>`.
- End the job. A job left `started` is resumed on the next boot and re-runs its actions against a GitHub it cannot reach.
- Delete the directory before the verdict and confirm `git status --porcelain` is empty.

## Read it back the way the operator does

- CLI: `bun run cli/dispatch.ts --socket <abs path> flows | jobs | show <flow>/<owner>/<repo>/<key> | watch`. Check the exit codes: 0, 1 for a missing job, 2 for a missing socket.
- Web: `DISPATCH_SOCKET=<abs path> PORT=3999 node build` from `web/`, after `bun run build`. Fetch `/`, `/flows/<flow>` and a job page, and read the server-rendered text. The task, the action, its exit and its output must be there before hydration.
- `watch` prints the snapshot and then each change, so one job can appear twice when it lands inside the subscription.

## Reproduce a finding

- A finding about behaviour gets a temporary test that prints the value. Write it, run `go test -run <Name> -v`, quote the log, delete it.
- A finding about the record needs the read path: run the job, then ask the API handler with `httptest` and print its JSON.
