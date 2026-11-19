---
name: dispatch-web-client
description: Use when editing the Dispatch web-client mock.
version: 1.0.0
author: MiMi <mimi@aivara.se>
license: MIT
metadata:
  hermes:
    tags: [dispatch, mock, ui, github]
    related_skills: [dispatch, claude-design, page-geometry-cdp]
---

# Dispatch web-client mock

A read-only HTML mock of the Dispatch client, published on `aivara-se/dispatch` branch `next`.

## When to Use

- A request names `docs/web-client-mock.html`, `DESIGN.md` on dispatch, or "the mock".
- The operator asks for a UI change to the Dispatch client before it is built.
- You need to publish or preview the mock on `next`.

## Files

- Source: `/root/mocks/dispatch/c-bench.html` (self-contained: inline CSS, embedded woff2, no network).
- Published: `docs/web-client-mock.html` on `next`; design spec: `DESIGN.md` at the repo root.
- Publish worktree: `/root/tmp/dispatch-next` — **detached HEAD**.

## Source of truth

`PRODUCT.md`, `SYSTEMS.md` and `docs/adrs/*` on `origin/next`. **Fetch and re-read them at the current head at the start of every editing round** — the model has been rewritten under the mock more than once (an issue root, then a pull-request root, then the same view stripped back), and a section you built last round may now be wrong. Never edit PRODUCT.md or SYSTEMS.md (MaMa owns them); if the mock contradicts them, say so in the reply and let MaMa amend.

Vocabulary must exist in those files. If a label or a counter is not defined there, do not ship it: the operator asks what it means and then tells you to remove it. A term that only appears inside an acceptance line as a gloss (`session`, `round`) is not a unit you may count. Retired words (`run`, `issue` as a root, `round` as a flow step, `step`, `session` as a counter, `needs human` — a stopped flow reads `blocked.`) must be grepped out of the HTML and DESIGN.md before every push — the operator reads the page, not the diff, and will catch a leftover label.

Numbers on screen are computed from the record at render time (time, cost, verdict). Authored totals drift from the states as the data is edited, and the operator will find the contradiction. The rail's span and the TIME card must come from the same measurement (first event → last event), or one screen shows two answers to one question.

## Model

- The pull request, `repo#n`, is the only root. No issue, no run.
- A flow is the tasks on one pull request; a task is one agent session: one prompt, one postcondition, evidence, cost.
- The flow is review → correct (the owner) → review again as needed → merge → verdict. Implementation happens before the trigger and is never a task. `red-main` is out of scope.
- No parallel tasks in this version — never draw `together`, rounds or flow steps.
- The record holds the pull request's history — `created`, `errored` (a failing check), `mentioned`, `reviewed`, `corrected`, ending in `merged` or `closed`. The page no longer draws it, but TIME still comes from it: derive events only from tasks whose `pc.got` is non-null, or a review still in flight counts as history.
- Derive every task's completion time from the flow's start plus the task durations (`cause + Σ dur`). Hand-written `at` values drift from the durations and the same span reads two different ways on one screen.
- A task writes one output on its pull request, one to three sentences. That output is the task's only public text; the prompt, tool calls, evidence and cost stay in the record.

## UI rules that took several rounds

- Simplicity is the standing brief: every element earns its place, and anything PRODUCT does not name comes out rather than gaining a label. This operator iterates by removal — expect a run of small deletions after a build, and do not defend the thing being deleted.
- When a decision needs the operator and the clarify card times out, take the recommended default, say in one line that you did, and keep going; he is often away and the work should not stall.
- Deleted after a build, and not to be restored without an explicit request: the event timeline/flow graph, the advanced-search panel and its four filters, section headers over the flow and tasks, counts in group headers, the pull-request kind pill, the cause line under the title, the object link and the assertion/evidence/tools blocks in the task panel, and the agents card. Each was added on a stated requirement and removed on sight; assume the stripped version is the wanted one.
- The task panel is the prompt, then the output in a sunken block, and nothing under it. A task still running shows `not posted yet` instead of an output. Do not add the assertion, evidence or tool timeline back — PRODUCT keeps them in the record and names only prompt and output for the client.
- Both blocks are flush left at the same edge as the `TASK n` header, with a gap above the `PROMPT` label so it does not touch the header row.
- Data points: three cards at the head of the task column — time, cost, verdict. Not above the whole pane, and no agents card.
- Task rows: a short verb (`review`, `correct`, `merge`) with the task's clock time pinned right — not the full task name, not a duration.
- Rail: three groups — blocked, started, finished — with one example record each and no counts.
- Search is one plain text field; it filters the rail by `data-text` and hides empty groups. No icon, no panel, no reset.
- Read-only: navigation and disclosure only.
- No left accent bars; selection is a flat fill. No section headers where a card or a strip already groups the content.
- The pull request reference links to `/pull/n` with no icon.

## Verify

Headless Chromium over CDP on `127.0.0.1:9222` — a plain Node script keeps the assertions in the file and reruns in one command — then:

```
node /root/mocks/dispatch/check-prs.mjs
```

It parses `var PRS` out of the HTML and asserts every record at 1440×900 and 1024×800: reference and href, title, the three stats against the data, one prompt and one output per task (or `not posted yet`), the short name and clock time on each row, and the absences — no timeline, no object link, no assertion or disclosure in the panel — plus the cards sitting inside the task column, no overflow and no console errors. Screenshot with `Page.captureScreenshot` clipped to the pane and read it with vision.

When a check script writes a regex inside a `Runtime.evaluate` template literal, the backslash is consumed twice; `/\s+/g` can arrive as `/s+/g` and silently strip the letter `s` from every value. Prefer `textContent` and plain comparisons over regex in the injected expression.

Removing a control is four edits — markup, CSS, its `<symbol>` icon, and every JS reference. A leftover `$('#id').addEventListener` throws at boot and leaves the pane empty; `node --check` passes, so only the CDP console check catches it.

Slice edits between two anchors (`s.index(a)` to `s.index(b)`) quietly eat whatever lies between them: a slice meant to drop an object link ran to the panel's closing tag and took the prompt with it. Print the lines around each anchor before slicing, and let the checker prove the line you meant to keep survived.

## Publish

```
cp /root/mocks/dispatch/c-bench.html /root/tmp/dispatch-next/docs/web-client-mock.html
git add -A DESIGN.md docs/web-client-mock.html && git commit
git fetch origin next:refs/remotes/origin/next && git rebase origin/next
git push origin HEAD:next
```

Pitfalls:

- The worktree is detached, so `git push` does not move `origin/next` locally — fetch to confirm 0/0 ahead-behind and equal blobs (`git hash-object` against `git rev-parse origin/next:path`).
- Peers push to `next` while you work: expect the push to be rejected, then fetch and rebase.
- `next` can be rebuilt rather than advanced — MaMa has replaced the whole tree (`chore: remove the v1 tree`, then `docs: add dispatch 2.0`), so the branch no longer shares history with your commits. Then `git fetch origin next:refs/remotes/origin/next` is itself rejected as non-fast-forward; fetch into `FETCH_HEAD` and check it, then replay your one commit with `git rebase --onto FETCH_HEAD <your-old-parent> HEAD`. Diff `FETCH_HEAD:docs/web-client-mock.html` against your file first: if the tree is the same apart from your edit, the replay is a two-line patch.
- When `DESIGN.md` conflicts, take `origin/next`'s file as the base and rewrite only the prose you changed; `git checkout -- DESIGN.md` silently discards an uncommitted draft, so copy it to `/tmp` first.
- `DESIGN.md` is MaMa's and now holds language and experience only — its frontmatter declares `omitted: components: the mock is the reference; this file holds no component anatomy`. A UI change usually needs no DESIGN edit: read the current file first, edit it only when a rule of the surface changed, and never reintroduce the component section it dropped.
- Never `git reset --soft origin/next` on this detached worktree to recover from a failed rebase: the index still holds your old tree, so PRODUCT.md, SYSTEMS.md and ADR renames stage as reverts. Abort the rebase, `git reset` (mixed), restore the non-mock files from HEAD, then stage only the mock and DESIGN.md.
- Kill the CDP browser before publishing. A long round of checks leaves 100+ Chromium processes; the sandbox then cannot spawn a thread, and `git push` dies with `errno=11` and a Go stack trace from the credential helper. `pgrep -f 'cdp-[c]heck'` and `kill -9` the PIDs, then push again — nothing is lost, the commit is already made.
- When DESIGN.md was rewritten upstream and only the mock changed, the fast recovery is: copy the mock to `/tmp`, `git reset --hard origin/next`, copy it back, stage only the mock, commit. The mixed reset in the bullet above is for when both files are yours.
- Report the commit and what was measured at 1440 and 1024 in the reply; this operator judges the live page, not the description.
- Kill the CDP Chromium with `pgrep -f 'cdp-[c]heck'` and explicit PIDs. A `pkill -f chrome` or `pkill -f http.server` also matches the shell's own command line and takes the session down mid-command.

## Preview

Serve `/root/mocks/dispatch` on `127.0.0.1:8099` and expose it with `cloudflared tunnel --url http://127.0.0.1:8099`; the hostname changes each run, and the sandbox resolver may cache a negative answer — test with `curl --resolve host:443:104.16.231.132`.
