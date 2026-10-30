---
name: benchmarking
description: "Use when a speed or cost claim needs a measured number."
version: 1.0.0
author: MiMi
license: MIT
tags: [benchmark, measurement, performance, experiment, latency, cost, harness, bun]
metadata:
  hermes:
    tags: [benchmark, measurement, performance, experiment, latency, cost, harness, bun]
    category: software-development
    related_skills: [spike, testing, writing]
---

# Benchmarking

A number without the decision it changes is trivia. Every benchmark here starts with
the decision and ends with a verdict, not with a time.

## When to Use

- The user asks whether something is faster, cheaper or scales, and an adjective will
  not do.
- I am about to claim a speed or cost win in a report, a pull-request body or a design.
- A recurring experiment needs a harness that a later session can re-run unchanged.

## 1. Frame it

- Write the hypothesis as a number plus the decision it changes: "an extra test file
  costs under 1 ms, so file count is not the lever". A hypothesis with no threshold
  cannot fail, so it cannot teach anything.
- Do 2–3 searches before building: prior art often already has the number, and a
  plausible range tells you when your own result is a bug rather than a finding.
- Check the CPU quota before expecting parallelism: `cat /sys/fs/cgroup/cpu.max`
  (200000 100000 = 2 CPUs). `nproc` reports host cores inside a container, so a
  6-core expectation against a 2-core quota reads as a bad library instead of a bad
  assumption.

## 2. Design the harness

- Change one variable. Two shapes of the same work isolate it: N files × 1 test versus
  1 file × N tests separates per-file cost from per-test cost, which one shape cannot.
- Time the whole process, spawn to exit, with `performance.now()` around `Bun.spawn`:
  a tool's cost includes start-up, and timing only the inner loop measures something
  no developer waits for.
- Sample 4–5 sizes and fit least squares to split fixed cost (intercept) from per-unit
  cost (slope). One point tells you a time, not where the time goes.
- Run at least 3 repetitions per point and report the median plus the spread. State the
  noise floor: on a 6 ms run, differences under 2 ms are noise and must not become a
  verdict.
- Write every raw run to `results.json` beside the harness. A summary table cannot be
  re-analysed when someone asks about variance.
- Add the shape that carries the realistic cost, not just the minimal one: a trivial
  file isolates runner overhead, an importing file shows what overhead does on real code.
- Measure a crossover instead of assuming one: parallel beats serial only past the point
  where per-unit work outgrows per-unit spawn cost, and below it can be several times
  slower. Sweep 0, 1, 10 and 50 ms of work per unit to find the flip.

## 3. Write it up

- Structure: problem, hypothesis (written before the run), method, results table,
  verdict, limits, what to do.
- Verdict is `VALIDATED`, `PARTIAL` or `INVALIDATED`. A failed hypothesis is a result;
  say what would have made it true.
- Limits carry the confounds that could flip the answer: the runner's process model, a
  CPU quota, warm versus cold cache, synthetic versus real input. A confound noticed and
  not written down is a wrong verdict later.
- Close with the decision, in the imperative: what to do, what not to do, what to
  measure next.
- Cite only pages actually read; a link never opened is decoration.

## Pitfalls

- Bun executes TypeScript directly: name the harness `.ts` when it carries annotations.
  A `: number` inside a `.js` file fails before the measurement starts.
- Report the unit and the run count with every number; "0.18" alone gets quoted as
  0.18 seconds within a week.
- Keep the harness re-runnable in seconds. One that needs a build, a database or a
  browser will not be repeated, and an unrepeated number is a rumour.
- Synthetic input is the default: no network, no licence, no personal data. Real public
  data is allowed only when it is small, freely licensed and fetched once.

## Reference

- `references/sdlc-experiment-log.md` — the standing one-experiment-a-day repo, its
  directory shape, publishing loop and safety limits.
