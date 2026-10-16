# Probing a running change

## When to use

Use when the change's claims are about behaviour at runtime — a boot, an order between two side effects, a refusal, a repeat, a restart — and the repository's own tests stub that world away. Reading the code answers none of it; stubs of the change's backends answer all of it, and the probe is what makes the finding reproducible for the author.

## Where it runs

Build and run the artifact from your home directory, not `/tmp`: a sandbox commonly mounts `/tmp` `noexec`, and an artifact that cannot be exec'd looks like a build failure. Keep one probe per directory — `<home>/scratch/<name>/` — so the harness, its logs and the artifact are separate files you can point the review at.

## The shape

1. Build the artifact from the branch under review, not from `main` — and build the parent, the pull request's own base commit, beside it. The pair is what turns "this is fixed" into evidence: the parent shows the defect happening, the head shows it not happening.
2. Stub everything external the change talks to: an HTTP backend (state, not fixed answers — see the template), an executable standing in for a process the change spawns, and the clock where a claim turns on time.
3. **Make the stub's writes reach its reads.** A stub that still answers the old read after a write it accepted invents behaviour: the change re-acts on the same input on every pass, and you will report your own harness as a defect. Model the round trip — apply the write to the stub's state and serve the next read from it — before you conclude anything.
4. Timestamp every observable the claims are about, on the stub's side and on the spawned process's side (stub: epoch, method, path, body; child: epoch, pid, argv). An ordering claim — "the write precedes the run" — is then arithmetic on two logs, not an argument about the code.
5. Drive the entry point the way production does: a real request through the listening socket, formed and signed as the sender forms it. Stop the process the way production stops it, then read the files it left: the record it writes is part of what a review checks.
6. Give asynchronous work a bounded poll rather than a sleep, and run the case that matters more than once: a race that shows once is a finding, and one that vanishes on the second run is your harness.

## Pitfalls

- Reserve ports by binding `127.0.0.1:0`, or give the stub and the service different ports. Two listeners on one port produce an "address already in use" that reads like the change's own boot bug.
- Kill the stub and the service between probes: a live leftover holds its port and can answer for the next run.
- Do not conclude from a single boot when the change has a boot-time pass and further triggers (a request, a child exiting): the second look is where repeats, claims and repairs show.
- A probe that only repeats the author's own test proves nothing new. Aim it at the case the tests skip — a missing input, a failure in the middle of an ordered sequence, a restart, a stale record.
- Keep the script and its raw output; cite the path and the command in the review, so the finding is reproducible rather than asserted.
- Run a boot-refusal probe under a bounded timeout and read its two outcomes apart: a non-zero exit carrying the message is the refusal, and a process still alive at the timeout is a boot that bound its listener — connect to the reserved port to confirm, rather than reading it off the clock. A refusal is proven by the whole set and not the message alone: nothing listened, the backend stub was never called, the spawned child never ran, and the record files are empty — a file that exists at 0 bytes was opened and never written, and an opened file is not a write.

## Template

`templates/stub-backend.py` — a mutable stub HTTP server: it checks a bearer token, serves reads from its state, and records every write with an epoch timestamp while applying it to that state. Copy it, then rename the read and write routes and the state's fields.
