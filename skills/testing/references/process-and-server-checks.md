# Booting the finished process

The unit tests prove the contract; this proves the artifact starts and answers. It is the check the operator is often promised in a pull-request body, so run it and quote it.

## Build and run from a scratch directory

- Build into the repository (`go build ./cmd/<name>`) so `.gitignore` covers the binary, then run it from a scratch directory outside the tree (`/root/scratch/<name>`, never `/tmp` — noexec and not yours). Anything the process writes relative to its working directory (logs, records, lock files) then lands where you can read it and delete it, not in the repository.
- Pass every path in the configuration as an absolute path, so the working directory only decides where output goes.
- Give the process a fake of each external program the configuration names, at the exact absolute path the configuration carries — create it only if nothing is there, and delete it when the run is over. A shell stub that writes `"$@"` to a file is enough to capture an invocation.

## The request matrix

Run the whole set, and read each status rather than the last one:

- a valid signed request — the success status, and the dependency captured the expected invocation;
- an unsigned or wrongly signed request — the authentication status, and nothing reached the dependency;
- a repeat of an identity the service remembers — the same success status, no second run, a line saying it was seen;
- a malformed or oversized body — its own refusal status, and no line recorded.

For a service that logs decisions, read the record file it wrote, not the stdout: it is the acceptance artifact.

## Shutting it down

- Terminate by the process you started, or `pgrep -x <binary>`. **Never** `pkill -f <pattern>`: the pattern matches your own shell's command line and the shell kills itself. A launcher that wraps the command (a background runner, `nohup bash -lc …`) reports the wrapper's pid — confirm the real process is gone before claiming the shutdown worked.
- Confirm the exit is clean and no stray process holds the port, then delete the scratch directory. Report what you observed: which statuses, which argv, exit behaviour.

## Two shell traps worth recognising

- Delete the directory a persistent shell is sitting in and every later command fails (`cd: … No such file or directory`, exit 126) before your command runs. Pass an absolute `workdir` on the next call instead of trusting the session's cwd.
- A background job started in a directory that does not exist yet fails instantly; create the directory in a command of its own, because the tool refuses `&` and a rejected command runs nothing at all.

## What the code should make visible

- Log the listening line after the bind succeeds (`net.Listen`, then `srv.Serve`). Logging first produces "listening" followed by "address already in use", which reads as a successful boot in a scrollback.
- On a signal, shut the server down with a bounded grace period and exit; a process that ignores the signal leaves the port held and the next run unexplainable.
