---
name: repo-bootstrap
description: Use when bootstrapping a repo to the org's conventions.
version: 1.0.0
author: MiMi (thani-sh-mimi), Aivara
license: MIT
platforms: [linux, macos, windows]
when-to-use: A new repository must be set up (workflows, AGENTS.md, documents) to the organisation's conventions, or an existing one checked against them.
metadata:
  hermes:
    tags: [scaffolding, bootstrap, conventions, workflows, documentation]
    category: software-development
    related_skills: [github, writing, change-planning]
---

# Bootstrapping a repository

A new repository is set up by mirroring a sibling, not from a blank page: the sibling already carries the organisation's shape, and a reviewer compares the two. The user names the reference ("check the X project as reference") — clone it and read the whole tree first.

## When to Use

- A new repository is created and must be set up to the organisation's conventions: workflows, `AGENTS.md`, documents.
- An existing repository must be checked against those conventions.

## Procedure

1. **Recon.** Clone the named reference and read its whole tree: `.github/workflows/`, `AGENTS.md`, `README.md`, `.gitignore`, `docs/` (`PRODUCT.md`, `SYSTEMS.md`, `adrs/`) and the manifest (`go.mod`). Read the organisation's shared repos too: `aivara-se/.agents` holds the donor `AGENTS.md` template and the skills, and `aivara-se/.github` holds the baseline settings and the workflow policy (`docs/SETTINGS.md`): every repository carries a workflow named `validate`.
2. **Settle the blocking facts before writing.** The stack decides the steps of the `validate` workflow, `.gitignore` and the system document; the product's shape decides the product document. Ask the operator for both in one batch — options with a recommended default first — rather than inventing them. He decides in batches and answers as a numbered list.
3. **Write the deliverables.** See *What a bootstrap ships*.
4. **Verify, then open a pull request.** See *Verification*.

## What a bootstrap ships

- `.github/workflows/validate.yml` — the gate, with the workflow and job named `validate`, copied from the reference (Go: `actions/checkout@v7`, `actions/setup-go@v7` with `go-version-file: go.mod`, then `gofmt -l .`, `go vet ./...`, `go test ./...`).
- `AGENTS.md` — the donor template from `aivara-se/.agents` copied in, slots filled, in the reference's shape.
- `docs/PRODUCT.md` — what it is for, who for, how it is judged, what it never does, what v1 does not do, acceptance.
- `docs/SYSTEMS.md` — where it runs, the request path, configuration and secrets, failure modes, checks.
- `docs/adrs/000-record-architecture-decisions.md` — the meta ADR; then one ADR per significant choice, numbered, Context / Decision / Consequences.
- `README.md` — what it is, how to run it, the checks, links to the documents.
- The manifest (`go.mod` or the stack's) and a minimal buildable entry point so the gate has something to build.
- `.gitignore` — minimal and purposeful (the built artifact and what the service writes down), not the GitHub boilerplate template.

## Pitfalls

- **Ship `validate`, not `checks`.** The workflow and job are named `validate` in `.github/workflows/validate.yml`; a `checks.yml` passes its own steps and still fails the organisation's settings check.
- **An empty Go module fails its own gate.** `go vet ./...` and `go test ./...` exit 1 with `matched no packages`; only `gofmt -l .` is clean. Ship `go.mod` and a minimal `cmd/<name>/main.go` stub so the checks workflow is green from the first pull request. Match the reference's `go` directive (the organisation's floor is `go 1.26`).
- **Adopt `AGENTS.md`, do not fork it.** Copy the donor template and fill every `{{UPPER_SNAKE_CASE}}` slot; no slot survives. Current adopters (the reference included) omit the donor's `Agent Skills` section — the shared skills are read from the `.agents` checkout through `skills.external_dirs`, not copied per repository.
- **One fact, one home.** PRODUCT, SYSTEMS and the ADRs must not restate each other; link instead. Add no fact, rule or section the request did not ask for.
- **No hard-wrap.** One paragraph, one bullet, one line per markdown line — a long single line is correct; a wrapped sentence is an artefact in the diff and the rendered page.
- **Prefer an external source of truth to a self-kept one.** A first draft that has the service maintain its own durable state — a ledger, a tally, a counter it rebuilds at boot — draws a change request: the org prefers the provider's or remote API as the record and keeps the service stateless across a restart (dispatcher's standing rule). Where a fact already lives elsewhere, read it; do not copy it.
- When the design is a first draft from a thin brief, name which numbers are provisional (ports, units, keys) and flag them for the operator's read in the pull request.

## Verification

Run before pushing, and report what each printed:

- The gate: `gofmt -l .` prints nothing; `go vet ./...` and `go test ./...` exit 0.
- Every relative markdown link resolves to a file in the tree; no `{{` slot remains.
- Green CI is a per-sha fact: confirm it on the head commit (`gh pr checks`), not on the branch.

Then push a branch, open the pull request, and request review from the operator (`thani-sh`) and one peer agent. The pull request body says what changed, what was verified and how, and what was left out.
