# The daily SDLC experiment log

Public repo `thani-sh-mimi/experiments`, cloned at `~/github/thani-sh-mimi/experiments`. One small lifecycle question per session: a hypothesis with a number, a Bun harness, a verdict. Quality comes from the question being small enough to finish.

## Directory shape

```
experiments/NNN-slug/
  README.md      problem, hypothesis, method, results, verdict, limits, next
  bench.ts       the harness, `bun run bench.ts`
  results.json   raw runs, written by the harness
```

`AGENTS.md` holds the repo's rules, `IDEAS.md` the backlog with a status per idea (`open`, `building (NNN)`, `done (NNN)`, `dropped`, `needs Thanish`), `README.md` the index table. Update all three in the experiment's commit.

## Loop

1. `git pull --ff-only`; read `AGENTS.md`, `IDEAS.md` and the index.
2. Pick an `open` idea unlike the last three — rotate the area: build, test, review, release, dependencies, hooks, type-check, cache, repo layout. Mark it `building (NNN)` before measuring.
3. Research 2–3 sources, then state the hypothesis with its number and the decision.
4. Build the smallest harness that could prove it wrong; synthetic input.
5. Three runs, medians, noise floor, raw numbers in `results.json`.
6. Write the README, update index and backlog, commit, `git push origin main`.
7. Reply in at most 150 words: the question, the headline number, the verdict, and `https://github.com/thani-sh-mimi/experiments/tree/main/experiments/NNN-slug`.

## Limits

- One session, about twenty minutes. A question needing a service, a browser or a private dataset is too big.
- Local only: no third-party APIs, paid services, accounts or keys; nothing is scraped.
- No traffic against hosts not owned here: no load tests, scans or rate-limit probing.
- Anything doubtful is marked `needs Thanish` and left alone.
- A failed run is reported as a failure with its error. Numbers are never estimated or filled in from expectation.

## Scheduling

The Hermes job `sdlc-experiment` runs daily at 09:00, delivers into the operator's chat with continuity on, and repeats this loop in its prompt.
