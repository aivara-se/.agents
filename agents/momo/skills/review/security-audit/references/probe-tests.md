# Probe tests

A probe is a `_test.go` file in the package under audit, in the scratch copy
(`~/scratch/<agent>/<repo>-sec`). Its failing assertion or logged output is the
finding's evidence. The clone stays clean.

In-package, not a separate `_test` package: unexported state (counters, caches, the
seen map) is usually where the defect is, and a probe should not force an export.

Run one: `go test ./internal/<pkg>/ -run Probe -v`. The write-time lint on a single
`_test.go` reports `undefined:` for every package symbol — that is the linter checking
the file alone; the `go test` result is the one to read.

## Child environment

The runner is a script that dumps `env`; the test sets the secret the way systemd
would.

```go
script := filepath.Join(dir, "hermes")
os.WriteFile(script, []byte("#!/bin/sh\nenv > "+out+"\n"), 0o700)
t.Setenv("DISPATCH_WEBHOOK_SECRET", secret)
run.New(script).Start("momo", "reason")
// read out, look for the secret line
```

## Forge with a leaked key (end to end)

The strongest form of the finding: the child reads the key, and that key signs a
request the service acts on. Load the real configuration, start the real runner,
then sign with the value the child dumped.

```go
cfg, _ := config.Load(cfgPath)              // resolves the secret from the env
rc := New(cfg.Secret, cfg.AgentProfiles(), run.New(cfg.Hermes), recorder)
post(rc, "pull_request", "d1", body, signWith(secret, body))   // starts a run
// the child's dump yields `stolen`; signWith(stolen, body) also starts a run
```

Do not reuse the repository's `sign()` helper here — it holds the fixture secret.

## Unauthenticated cost

```go
var before, after runtime.MemStats
runtime.GC(); runtime.ReadMemStats(&before)
post(rc, "pull_request", "x", strings.Repeat("A", 1<<20), "sha256="+strings.Repeat("0", 64))
runtime.ReadMemStats(&after)
// (after.TotalAlloc-before.TotalAlloc)/1024 KiB for one 401
```

## State that never shrinks

Feed N distinct identifiers and read the map length in-package. Each iteration needs
a distinct delivery id, or the dedupe cache eats all but the first.

```go
for n := 1; n <= 5000; n++ {
    body := changesBodyOn(n, "submitted", "changes_requested", "a", "b")
    post(rc, "pull_request_review", fmt.Sprintf("d%d", n), body, sign(body))
}
t.Logf("rounds keys=%d", len(rc.rounds.count))
```

## Partial failure

A stub runner that fails on the Nth call, over a delivery that wakes several
exchanges, then read the audit record.

```go
func (f *failingSecond) Start(profile, reason string) error {
    f.calls = append(f.calls, call{profile, reason})
    if len(f.calls) == 2 { return errors.New("resource temporarily unavailable") }
    return nil
}
// decision="start_failed" profile="mama,meme" — yet one run started
```

## Identifier case

The payload sends the platform's canonical casing; the config carries what a human
typed. One post each way proves the mismatch, and `config.Load` on a document with
`momo` and `Momo` proves the duplicate check.

## Reading the dump back

A probe that greps a child's dump line by line loses an argument carrying a newline:
`$*` splits it across lines, so no line starts with `ARGV `. Flatten first
(`strings.ReplaceAll(dump, "\n", "\\n")`) and search the flattened text.
`t.Setenv` is the same mechanism systemd's `EnvironmentFile` uses, so a child's
dump of the test process's environment is the deployment's environment.

The child is asynchronous: poll the dump for the marker (`time.Now().Add(10*time.Second)`
with a 20 ms `Sleep`) and read only once it appears. A fixed `Sleep` races the script,
and a re-post inside that window is held by the run gate instead of starting — the
replay count then reads as one and looks like a defence that is not there.

## Concurrency

Barrier-release N goroutines posting the same id, `-count=30`. If it never
double-starts, the window is too narrow to claim — drop it.
