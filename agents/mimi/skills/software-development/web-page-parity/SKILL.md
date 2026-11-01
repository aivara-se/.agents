---
name: web-page-parity
description: Use when a page must match a reference page exactly.
version: 1.0.0
author: MiMi (mimi@aivara.se)
license: MIT
when-to-use: Porting a page, site or component into another app, merging standalone sites into one, or a redesign specified as "like X".
metadata:
  hermes:
    tags: [web, css, layout, porting, verification, cdp]
    related_skills: [dogfood]
---

# Web page parity

## When to Use

- A page, site or component must be ported into another app and look like the original.
- Standalone sites merge into one app and the old pages survive as routes.
- A layout claim — centred, one screen, no horizontal scroll — needs evidence, not an adjective.
- A redesign is specified as "like X".

Not for exploratory bug-hunting on a live app (`dogfood`), and not for authoring a new visual design.

## Procedure

Parity is a measurement problem, not a taste problem: port the reference's own source, neutralise what the host imposes, then diff the two pages' rendered geometry in a real engine.

1. **Read the reference's source, not a screenshot.** Separate what is per-instance (colour, copy, asset) from the shared skeleton. Port the skeleton; take per-instance values from a data table so they cannot drift.
2. **Port markup and CSS verbatim** — the same class names, values and order, so a later reader can diff them by eye. Change only asset paths, internal links and the framework's idioms. A _smaller_ variant keeps the original's measurements and the identity lines it leads with — a card that shows the name but not the role is a subset the operator sends straight back — and a row that cannot share a line at the narrowest width is a breakpoint decision (`web-frontend-delivery`), not a reason to shrink the source.
3. **Neutralise what the host imposes.** List the properties the host sets and the reference left to the browser: `line-height`, `box-sizing`, element `margin`, body font and colour, `a` colour and underline, `:focus-visible` outline, `h1..h3` defaults. Reset them at the ported root (`line-height: normal`, explicit `margin: 0`, an accent-scoped `a` rule). One inherited `line-height` moved every element by 11px.
4. **Keep the reference's page split and interaction model.** Two URLs stay two URLs; a site that shipped no JavaScript does not gain one for a hover state.
5. **Measure both** with `scripts/measure-page.mjs` at the same viewport, diff the values in code, and report how many are identical and each difference with its cause. A difference caused by new copy or a deliberate removal is not a defect — say so instead of normalising it.
6. **Verify on the deployed artifact, not only localhost.** The host's redirect table, adapter and prerender output are what production runs.

## Measuring: what counts as evidence

- Read geometry text-first: `getBoundingClientRect()` for position and size, `getComputedStyle()` for the property that decides it, `document.documentElement.scrollHeight <= innerHeight` for one screen, `scrollWidth <= innerWidth` for no horizontal scroll. Quote the numbers: a one-screen claim without `scrollHeight` is a guess, and a centring claim is `|centre − viewport/2| ≤ 1`.
- `scripts/measure-page.mjs` drives Chromium over CDP: launch, device metrics, navigate, probe, one JSON object; `--compare` prints only the differing keys.
- Compute contrast with `scripts/wcag-contrast.mjs` rather than trusting a palette document, against the _worst case_ surface (the lightest ground stop, the composited panel over it), and say which surface each number belongs to.
- With no image input, measured geometry and computed styles are the evidence. A screenshot you cannot read proves nothing you can quote.

## Pitfalls

- **Scope a string replacement to unique context.** A key in two blocks loses its first occurrence to a global replace; the type checker catches it, so run it before committing.
- **Name paths; never use a glob or a repo-wide formatter write.** `git rm src/routes/*` took three sibling route files, and `bun fmt .` rewrites approval-gated files without a prompt. Pass explicit paths, restore anything touched, and read `git show --stat` before pushing.
- **An agent-instruction file (AGENTS.md, CLAUDE.md, a rule file) a write is blocked on is a finding, not an obstacle.** Do not route around the guard — propose the edit in the pull request.
- **Kill a dev server by port, not by pattern.** `pkill -f '<pattern>'` matches the shell command that holds both the pattern and the launch: use `fuser -k <port>/tcp`.
- **A build proves nothing about the layout it emitted.** List the output directory and confirm the pages you expected.
- **Do not restate a design value in prose.** Point at the token or the table; two copies of a hex disagree.
- **Do not unify a role file's line with the page's line.** The file states the policy, the page the introduction, and a tidy sweep swaps one for the other. A line the operator flags belongs to that agent: restore it character for character and leave the rest alone.
- **When the operator hands you a format, touch only the fields it names**, and say in the report which ones you changed.

## Copy on a ported page

- **Propose the copy and wait for approval.** Landing an unconfirmed line costs a round of churn.
- The shape is two lines: **line 1 the role** (the same words as the role file), **line 2 one short first-person sentence** — casual, honest, under about fourteen words. Capitalise only the first word of the role (`Chief architect`), in both places.
- **Line 1 is the bare role.** A role file that titles itself with trailing traits needs its own edit; when the operator says the first line is for the role, drop everything after it.
- **A duty that moves leaves somebody's line stale.** Keep the operator's words, say which role the line now contradicts, and offer two swaps that keep the joke.
- **The role's own document is not a copy of the page.** Its shape is `# {Name} — {role}`, then one italic sentence: the policy that agent lives by. The page introduces the person; the file states the rule they work by. Fix the body sentence when a duty moves, and put the file's reviewer on the request.
- **The sibling lines are a set: rewrite them together** — one length (about ten words), one register, positive. A negative line is the one the operator rewrites.
- The second line is often the page's `<meta name="description">`: decide whether the joke carries into search. Label the lines you invented as yours, so a swap is one commit.

## Support files

- `references/sveltekit-cloudflare-parity.md` — `_redirects` placement, trailing slashes, prerender output, per-route layouts, what to check after a build.
- `scripts/measure-page.mjs` and `scripts/wcag-contrast.mjs` ship with the `web-frontend-delivery` skill in this category, not with this one: run them from there (`node <path to web-frontend-delivery>/scripts/measure-page.mjs <url> [width] [height] [expressionFile]`).
