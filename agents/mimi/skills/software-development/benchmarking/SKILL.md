---
name: benchmarking
description: "Use when a speed or cost claim needs a measured number."
version: 1.0.0
author: MiMi
license: MIT
tags:
  [benchmark, measurement, performance, experiment, latency, cost, harness, bun]
metadata:
  hermes:
    tags:
      [
        benchmark,
        measurement,
        performance,
        experiment,
        latency,
        cost,
        harness,
        bun,
      ]
    category: software-development
    related_skills: [spike, testing, writing]
---

# Benchmarking

A benchmark starts with a decision and ends with a verdict, not a time. Use it when the user asks whether something is faster, cheaper or scales, when you are about to claim a speed or cost win, or when a recurring experiment needs a harness a later session can re-run unchanged.

## 1. Frame it

- Write the hypothesis as a number plus the decision it changes: "an extra test file costs under 1 ms, so file count is not the lever". A hypothesis with no threshold cannot fail.
- Do 2–3 searches before building: prior art often holds the number, and a range tells you when your result is a bug rather than a finding.
- Check the CPU quota before expecting parallelism: `cat /sys/fs/cgroup/cpu.max` (200000 100000 = 2 CPUs). `nproc` reports host cores in a container, so a 6-core expectation against a 2-core quota reads as a bad library.

## 2. Design the harness

- Change one variable. Two shapes isolate it: N files × 1 test versus 1 file × N tests separates per-file from per-test cost.
- Time the whole process, spawn to exit, with `performance.now()` around `Bun.spawn`: a tool's cost includes start-up, and the inner loop is not what a developer waits for.
- Sample 4–5 sizes and fit least squares to split fixed cost (intercept) from per-unit cost (slope). One point tells you a time, not where it goes.
- Run at least 3 repetitions per point and report the median plus the spread. State the noise floor: on a 6 ms run, differences under 2 ms are noise, not a verdict.
- Write every raw run to `results.json` beside the harness.
- Add the shape that carries the realistic cost: a trivial file isolates runner overhead, an importing file shows what it does to real code.
- Measure a crossover instead of assuming one: parallel beats serial only past the point where per-unit work outgrows per-unit spawn cost, and below it can be several times slower. Sweep 0, 1, 10 and 50 ms per unit.

## 3. Write it up

- Structure: problem, hypothesis (written before the run), method, results table, verdict, limits, what to do.
- Verdict is `VALIDATED`, `PARTIAL` or `INVALIDATED`. A failed hypothesis is a result; say what would have made it true.
- Limits carry the confounds that could flip the answer: the runner's process model, a CPU quota, warm versus cold cache, synthetic versus real input.
- Close with the decision, imperative: what to do, what not to do, what to measure next.

## 4. Comparing a drop-in replacement

- Two numbers, not one: wall clock plus peak RSS on a real corpus, and **byte-level parity** — how many files the new tool emits identically to the incumbent. Speed alone does not justify a swap; a formatter, linter or bundler that changes output costs a review cycle per file.
- Pass the SAME explicit options to both tools on the command line (`--print-width 80 --use-tabs false --single-quote false --no-semi=false`). Both discover config from the tree — Prettier reads `.prettierrc*`, `.editorconfig` and `"prettier"` in `package.json`; `bun fmt` reads those plus `bunfig.toml` and `.oxfmtrc.json`. One config seen by one tool manufactures hundreds of fake diffs.
- Copy the corpus twice, run each tool on its own copy, then `diff -rq`. Also compare each output against the pristine input: that separates "output differs" from "this tool never processed the file".
- Bucket the diffs by extension before quoting a parity figure. An opinionated default (sorted `package.json`, sorted imports, normalised Markdown) is usually most of the diff and is switchable, so report parity over the files where it is off or absent.
- Install the reference tool where module resolution works: the repo itself, or a scratch dir under `$HOME` with the plugin as a local dependency. Prettier resolves plugins from the config file's directory, so a corpus copied to `/tmp` dies with `Cannot find package '<plugin>'`, and `node_modules/.bin` under `/tmp` will not exec at all.
- Memory per tool: `resource.getrusage(RUSAGE_CHILDREN).ru_maxrss` is the running maximum across all children, so run each tool in its own Python process or the second reading just repeats the first.
- State the thread count the tool used (`bun fmt` prints "using 2 threads"). In a 2-CPU sandbox the ratio does not transfer to an 8-core CI runner.

## Pitfalls

- Run the tool's own `--version` into the write-up. "Prettier is 100x slower" without a version is a claim about a moving target.
- Bun executes TypeScript directly: name the harness `.ts` when it carries annotations. A `: number` in a `.js` file fails before the measurement starts.
- Report the unit and the run count with every number; "0.18" alone gets quoted as 0.18 seconds.
- Keep the harness re-runnable in seconds; one that needs a build, a database or a browser will not be repeated.
- Synthetic input is the default: no network, no licence, no personal data. Real public data only when small, freely licensed and fetched once.

## Reference

- `references/sdlc-experiment-log.md` — the standing one-experiment-a-day repo, its directory shape, publishing loop and safety limits.
- `references/tool-parity-comparison.md` — command recipe for measuring a drop-in replacement: corpus setup, matched flags, diff bucketing, expected shape.
