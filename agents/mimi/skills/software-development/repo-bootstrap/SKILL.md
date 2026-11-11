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

Mirror a sibling, not a blank page: the sibling carries the organisation's shape and a reviewer compares the two. The user names the reference ("check the X project as reference") — clone it and read the whole tree first.

## Procedure

1. **Recon.** Clone the reference and read its tree: `.github/workflows/`, `AGENTS.md`, `README.md`, `.gitignore`, `docs/` (`PRODUCT.md`, `SYSTEMS.md`, `adrs/`) and the manifest (`go.mod`). Read the shared repos too: `aivara-se/.agents` holds the donor `AGENTS.md` template and the skills; `aivara-se/.github` holds the baseline settings and workflow policy (`docs/SETTINGS.md`) — every repository carries a workflow named `validate`.
2. **Settle the blocking facts before writing.** The stack decides the steps of `validate`, `.gitignore` and the system document; the product's shape decides the product document. Ask for both in one batch, options with a recommended default first — he decides in batches and answers as a numbered list.
3. **Write the deliverables.**
4. **Verify, then open a pull request.**

## What a bootstrap ships

- `.github/workflows/validate.yml` — the gate, workflow and job named `validate`, copied from the reference (Go: `actions/checkout@v7`, `actions/setup-go@v7` with `go-version-file: go.mod`, then `gofmt -l .`, `go vet ./...`, `go test ./...`).
- `AGENTS.md` — the donor template from `aivara-se/.agents`, slots filled, in the reference's shape.
- `docs/PRODUCT.md` — what it is for, who for, how it is judged, what it never does, what v1 does not do, acceptance.
- `docs/SYSTEMS.md` — where it runs, the request path, configuration and secrets, failure modes, checks.
- `docs/adrs/000-record-architecture-decisions.md` — the meta ADR; then one ADR per significant choice, numbered, Context / Decision / Consequences.
- `README.md` — what it is, how to run it, the checks, links to the documents.
- The manifest and a minimal buildable entry point so the gate has something to build.
- `.gitignore` — minimal and purposeful (the built artifact and what the service writes), not the GitHub boilerplate.

## Pitfalls

- **Ship `validate`, not `checks`.** A `checks.yml` passes its own steps and still fails the organisation's settings check.
- **A proof of concept goes to the agent's own account, not the org.** `aivara-se` holds products the operator runs and reviews; a spike lives under `thani-sh-<name>`. `gh repo transfer` is not in the installed CLI — `gh api -X POST repos/<org>/<repo>/transfer -f new_owner=<user>`, then point the local remote at the new URL; the old URL redirects.
- **The documents are a mechanical gate.** `aivara-se/.github` runs `scripts/validate-docs.ts --require` over `PRODUCT.md` and `SYSTEMS.md`: an exact set of `##` headings, in order, with no extra heading, plus a word cap per section and in total (product 600 words, systems 300). Draft to the caps, and run the checker before the push — `gh api repos/aivara-se/.github/contents/scripts/validate-docs.ts --jq .content | base64 -d > /tmp/validate-docs.ts` then `bun /tmp/validate-docs.ts . --require`. A draft that follows the organisation's prose habits but not the caps fails CI alone.
- **Follow the new stack's scaffold, not the reference's.** The reference carries the shape — workflow name, `AGENTS.md`, the document set; the stack carries its own commands and config format. Read the installed package's version before writing config from memory; `references/sveltekit-stack.md` is the working recipe for a SvelteKit server app.
- **Add the Format step to the gate.** `validate.yml` runs `bun fmt --no-script --check .`; run `bun fmt --no-script .` then the check, or CI fails on formatting alone. Bun's formatter needs no config file and no dependency.
- **An empty Go module fails its own gate.** `go vet ./...` and `go test ./...` exit 1 with `matched no packages`; only `gofmt -l .` is clean. Ship `go.mod` and a minimal `cmd/<name>/main.go` stub, matching the reference's `go` directive (the floor is `go 1.26`).
- **Adopt `AGENTS.md`, do not fork it.** Fill every `{{UPPER_SNAKE_CASE}}` slot. Adopters omit the donor's `Agent Skills` section — the shared skills are read from the `.agents` checkout through `skills.external_dirs`, not copied per repository.
- **One fact, one home.** PRODUCT, SYSTEMS and the ADRs must not restate each other; link instead. Add no fact, rule or section the request did not ask for.
- **No hard-wrap.** One paragraph, one bullet, one line per markdown line; a wrapped sentence is an artefact in the diff and the rendered page.
- **Prefer an external source of truth to a self-kept one.** A draft where the service keeps its own durable state — a ledger, a tally it rebuilds at boot — draws a change request: the org prefers the provider's or remote API as the record and keeps the service stateless across a restart.
- Name which numbers are provisional (ports, units, keys) when the design comes from a thin brief, and flag them in the pull request.

## Verification

Run before pushing, and report what each printed:

- The gate: `gofmt -l .` prints nothing; `go vet ./...` and `go test ./...` exit 0.
- Every relative markdown link resolves to a file in the tree; no `{{` slot remains.
- The document gate prints `pass`: `bun /tmp/validate-docs.ts . --require`.
- Green CI is a per-sha fact: confirm it on the head commit (`gh pr checks`), not on the branch.

Then push a branch, open the pull request, and request review from the operator (`thani-sh`) and one peer agent. The body says what changed, what was verified and how, and what was left out.
