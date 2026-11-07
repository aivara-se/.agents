---
name: project-audit
description: Audit one repository a day against its own gate.
version: 1.1.0
author: MoMo
license: MIT
when-to-use: A daily audit wake arrives, or the operator asks for this week's project audit.
metadata:
  hermes:
    tags: [audit, review, github, cron]
    related_skills: [review, dispatch, writing, security-audit]
---

# Project audit

One merged repository per day. You report; you never fix. A review holds a change to its contract; this holds a repository to its own declared gate and to the tree it ships.

## Run it

```bash
python3 ~/state/project-review/audit.py run
```

The script picks the repository that is due, checks it out at a pinned sha in `~/scratch/momo/audit/<repo>`, and prints one JSON object. It writes the same object to `~/state/project-review/work/<date>-<repo>.json` and appends the ledger.

- `verdict`: `pass`, `fail` or `not run`.
- `checks`: `gate`, `ci`, `claims`, `open`, `exposure`, each with a state.
- `hard`: defects that earn an issue.
- `soft`: findings that the report carries.
- `exemptions`: what the run skipped on purpose, and why.

A second run on the same day prints `skipped`. Stop there. Do not pass `--repo` unless the operator named a repository.

The script lives under the home mount, not in the profile's `scripts/` directory: a cron job's shell is the sandbox, and the profile tree is not mounted there. The skill calls the script; the job's prompt stays a pointer.

## How it picks

Every run lists the organisation live and audits the repository whose last audit is oldest. A repository with no row goes first, so a new project enters by itself; a removed one is skipped once it is absent. No list is hardcoded, so adding or deleting a project changes nothing in the job.

- One row per repository per day. A duplicate fire prints `skipped`; never audit twice to fill a quiet day.
- An exemption covers a gap the repository owns, and only while that gap exists. The script reads the tree first: a gate that now exists runs, exemption or not.

## Changing a check

What each check reads, and the false positive it already carries, is `references/checks.md`.

- Strip code spans and fenced blocks before scanning prose. A document that quotes `](…)` or `bun run scripts/x.ts` describes syntax; it makes no claim about the tree.
- `permissions:` counts at any indentation. Job level is valid and sufficient; only its absence is a finding.
- A line that dies on the environment is `not run`, never `fail`: no display, no shared library, no network. The job files issues unattended, so a wrong `fail` becomes a wrong issue.
- Prove a new check on a planted case and on a plausible innocent one before you trust a clean run. A pattern that cannot match reports every repository as tidy.

## Before you write one word

- Read the `tail` of every failing gate row. It is the evidence, and it is what you quote.
- `not run` is not a pass. Say which line did not run, and why.
- The script cannot confirm branch protection; `requiredCheck` is usually `unknown`. Never call that a defect.
- A hard candidate is a claim, not a fact. Read the file and line. A documented placeholder, an example key or a fixture is not a secret: move it to `soft` and say so.

## Hard defects

These earn an issue, at most two in one run:

- a declared gate line fails at the audited head;
- `validate` is red on the default branch at that sha;
- a live credential is committed.

File it on the audited repository:

```bash
gh label create audit --repo aivara-se/<repo> --color B60205 \
  --description "Found by the daily audit" 2>/dev/null || true
gh issue create --repo aivara-se/<repo> --label audit \
  --title "audit: <what is broken, where>" --body-file /tmp/audit-issue.md
```

Body, 150 words or less: what is broken, the command and the output that prove it, the file, and the smallest fix. No speculation about cause. One issue per defect; if an open issue already carries it, comment there instead of opening a second.

## The message

Answer first, 150 words or less:

1. The verdict, the repository and the short sha.
2. Each failing check in one line, with the command or number that proves it.
3. What you filed, by number.
4. What did not run, and what the run skipped as known.

Attach the JSON at `path` when a reader needs the detail, and stop there.

A clean repository gets three lines. Do not pad it into a status report.

## The ledger and the exemptions

- `~/state/project-review/ledger.json` holds one row per repository. The script writes it; do not edit it by hand.
- `~/state/project-review/config.json` holds the exemptions and the reason for each. Add one only when the operator agrees, and write the reason in the `note`. Do not restate the set here: that file is the live record.
- A removed repository keeps its row until it is absent 30 days. The script prunes it.

## When the script fails

- Non-zero exit or a traceback: report the last line, and the repository it was working on. No issue. The ledger is untouched, so the next run retries.
- No repository is due, or the organisation cannot be read: report that in one line and stop.

## Closing a finding

The audit never fixes. When the operator asks for a fix, the change is a branch and a pull request under `coding`.

- A repository that runs a gate in CI but declares none gets the declaration, not a second workflow. Mirror the commands its `validate` job runs and name that job in the file.
- Drop the repository's exemption once the gap closes. An exemption describes the tree, and the tree moved.

## What you never do

- Push, force-push, open or edit a pull request, or commit a fix.
- Comment on a pull request. This audit is not a review.
- Audit a repository outside `aivara-se`.
- Report "tests pass" without the command and the sha it ran against.
