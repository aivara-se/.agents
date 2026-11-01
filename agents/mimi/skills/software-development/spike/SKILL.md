---
name: spike
description: "Throwaway experiments to validate an idea before build."
version: 1.0.0
author: Hermes Agent (adapted from gsd-build/get-shit-done)
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags:
      [
        spike,
        prototype,
        experiment,
        feasibility,
        throwaway,
        exploration,
        research,
        planning,
        mvp,
        proof-of-concept,
      ]
    related_skills: [benchmarking, sketch, subagent-driven-development]
---

# Spike

A spike answers feasibility before a real build: "let me try this", "is this even possible?", "compare A vs B". Spikes are disposable by design — throw them away once they have paid their debt.

## When NOT to use this

- The answer is knowable from docs or reading code — research, don't build.
- The work is production path — plan it instead.
- The idea is already validated — implement.
- The question is price rather than feasibility (`is X faster than Y`) — use `benchmarking`.

If `gsd-spike` is installed as a sibling skill, prefer it for the full GSD workflow (persistent `.planning/spikes/` state, MANIFEST tracking, Given/When/Then verdicts). This is the standalone version.

## Core method

```
decompose  →  research  →  build  →  verdict
   ↑__________________________________________↓
                  iterate on findings
```

### 1. Decompose

Break the idea into **2-5 independent feasibility questions**, one spike each, as a table:

| # | Spike | Validates (Given/When/Then) | Risk |
| --- | --- | --- | --- |
| 001 | websocket-streaming | Given a WS connection, when LLM streams tokens, then client receives chunks < 100ms | High |
| 002a | pdf-parse-pdfjs | Given a multi-page PDF, when parsed with pdfjs, then structured text is extractable | Medium |
| 002b | pdf-parse-camelot | Given a multi-page PDF, when parsed with camelot, then structured text is extractable | Medium |

**Types:** standard (one approach, one question) and comparison (same question, different approaches, shared number with `a`/`b`/`c` suffix).

**Good questions** are specific feasibility with observable output. **Bad ones** are too broad, have no observable output, or are "read the docs about X".

**Order by risk.** The spike most likely to kill the idea runs first.

**Skip decomposition** only when the user already names the single thing to spike.

### 2. Align (multi-spike ideas)

Present the table and ask: "Build all in this order, or adjust?" Let the user drop, reorder or re-frame before you write code.

### 3. Research (per spike, before building)

Research enough to pick the right approach, then build. Use `web_search`, `web_extract` for real docs, and `terminal("pip show …")` for what is installed. For a library without doc pages, clone it and read `README.md` / `examples/`. Context7 MCP, if configured, is another source.

### 4. Build

One standalone directory per spike:

```
spikes/
├── 001-websocket-streaming/
│   ├── README.md
│   └── main.py
├── 002a-pdf-parse-pdfjs/
│   ├── README.md
│   └── parse.js
└── 002b-pdf-parse-camelot/
    ├── README.md
    └── parse.py
```

**Bias toward something the user can interact with.** Spikes fail when the only output is a log line saying "it works". In order of preference: a runnable CLI, a minimal HTML page, a small web server with one endpoint, a unit test with recognizable assertions.

**Depth over speed.** Never declare "it works" after one happy-path run. Test edge cases; follow surprising findings.

**Avoid** complex package management, build tools, Docker, env files and config systems. Hardcode everything.

**Parallel comparison spikes — delegate.** When two approaches both need real engineering, fan out:

```
delegate_task(tasks=[
    {"goal": "Build 002a-pdf-parse-pdfjs: ...", "toolsets": ["terminal", "file", "web"]},
    {"goal": "Build 002b-pdf-parse-camelot: ...", "toolsets": ["terminal", "file", "web"]},
])
```

Each subagent returns its own verdict; you write the head-to-head.

### 5. Verdict

Each spike's `README.md` closes with:

```markdown
## Verdict: VALIDATED | PARTIAL | INVALIDATED

### What worked

- ...

### What didn't

- ...

### Surprises

- ...

### Recommendation for the real build

- ...
```

**VALIDATED** = the core question answered yes, with evidence. **PARTIAL** = it works under constraints X, Y, Z — document them. **INVALIDATED** = it doesn't work, for this reason; that is a successful spike.

## Comparison spikes

When two approaches answer the same question, build them back to back, then compare:

```markdown
## Head-to-head: pdfjs vs camelot

| Dimension            | pdfjs (002a)        | camelot (002b)    |
| -------------------- | ------------------- | ----------------- |
| Extraction quality   | 9/10 structured     | 7/10 table-only   |
| Setup complexity     | npm install, 1 line | pip + ghostscript |
| Perf on 100-page PDF | 3s                  | 18s               |
| Handles rotated text | no                  | yes               |

**Winner:** pdfjs for our use case. Camelot if we need table-first extraction later.
```

## Frontier mode (picking what to spike next)

Walking existing spike directories, look for:

- **Integration risks** — two validated spikes touching the same resource, tested separately
- **Data handoffs** — spike A's output assumed compatible with spike B's input, never proven
- **Gaps in the vision** — capabilities assumed but unproven
- **Alternative approaches** — different angles for PARTIAL or INVALIDATED spikes

Propose 2-4 candidates as Given/When/Then and let the user pick.

## Output

- `spikes/` (or `.planning/spikes/` under GSD) in the repo root, one `NNN-descriptive-name/` directory per spike
- `README.md` per spike: question, approach, results, verdict
- Keep the code throwaway — a spike needing two days to "clean up for production" was a bad spike

## Attribution

Adapted from the GSD project's `/gsd-spike` workflow — MIT © 2025 Lex Christopherson ([gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done)).
