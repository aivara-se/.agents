---
name: web-page-parity
description: Use when a page must match a reference page exactly.
version: 1.0.0
author: MiMi (mimi@aivara.se)
license: MIT
when-to-use: Porting a page, site or component into another app, merging standalone sites into one, or a redesign specified as "like X". Also when a layout claim needs evidence rather than an adjective.
metadata:
  hermes:
    tags: [web, css, layout, porting, verification, cdp]
    related_skills: [dogfood]
---

# Web page parity

## When to Use

- A page, site or component must be ported into another app and look like the original.
- Standalone sites are merged into one application and the old pages have to survive as routes.
- A layout claim — centred, one screen, no horizontal scroll, avatar top-left, "identical to the original" — needs evidence rather than an adjective.
- A redesign is specified as "like X" and the result will be compared with X.

Not for exploratory bug-hunting on a live app (that is `dogfood`), and not for authoring a new visual design.

## Procedure

Parity work is a measurement problem, not a taste problem. Port the reference's own source, neutralise what the host app imposes on it, then diff the two pages' rendered geometry in a real engine and report the diff.

1. **Read the reference's source, not a screenshot.** Identify what is per-instance (colour, copy, asset, the one differing line) and what is the shared skeleton. The skeleton is what gets ported; the per-instance values come from a data table so they cannot drift.
2. **Port markup and CSS verbatim** — the same class names, values and order, so a later reader can diff the two by eye. Change only what must change: asset paths, internal links, the framework's idioms (a loop instead of four copies, a component instead of a repeated block). A *smaller* variant of the original's component — a mini card, a thumbnail row — keeps the original's own measurements (its portrait size, its type scale) and the identity lines the
   original leads with — a summary card that shows the name but not the role is a subset the operator
   sends straight back — rather than a shrunk invention; if a row of those cannot share a line at the narrowest supported width, that is a breakpoint decision to state (`web-frontend-delivery`), not a reason to reduce the source's proportions on the quiet.
3. **Neutralise what the host app imposes.** List the properties the host's global stylesheet sets and the reference relied on the browser's default for: `line-height`, `box-sizing`, element `margin`, body font and colour, `a` colour and underline, `:focus-visible` outline, `h1..h3` defaults. Reset them at the ported root (`line-height: normal`, explicit `margin: 0`, an accent-scoped `a` rule). One inherited `line-height` moved every element on the page by 11px.
4. **Keep the reference's page split and interaction model.** If the original was two URLs, port two URLs; if it shipped no JavaScript, do not add any for a hover or tap state — the reference's pure-CSS states still work.
5. **Measure both** with `scripts/measure-page.mjs` at the same viewport, then diff the values in code and report: how many are identical, and each difference with its cause. A difference caused by new copy, or by a deliberate removal, is not a defect — say so instead of silently normalising it.
6. **Verify on the deployed artifact, not only localhost.** The host's redirect table, adapter and prerender output are what production runs; fetch the deployed preview the CI/build emits and repeat the measurement there.

## Measuring: what counts as evidence

- Read geometry text-first: `getBoundingClientRect()` for position and size, `getComputedStyle()` for the property that decides it, `document.documentElement.scrollHeight <= innerHeight` for a one-screen claim, `scrollWidth <= innerWidth` for a no-horizontal-scroll claim. Quote those numbers.
- A one-screen claim without `scrollHeight` is a guess. A centring claim is `|centre − viewport/2| ≤ 1`.
- `scripts/measure-page.mjs` drives a Chromium over CDP: it launches the browser, sets the device metrics, navigates, evaluates the probe, prints one JSON object, and can run the same probe against two URLs (`--compare`) and print only the differing keys.
- For contrast, compute the ratios with `scripts/wcag-contrast.mjs` instead of trusting a palette document: measure against the *worst case* surface (the lightest ground stop, and the composited panel over it), and say which surface each number belongs to.
- When the model has no image input, measured geometry and computed styles are the evidence. A screenshot you cannot read proves nothing you can quote.

## Pitfalls

- **Scope a string replacement to unique context; never run a global search-and-replace over a file whose keys repeat.** A key that appears in two blocks (a nav label and a page label, two per-instance records) loses its first occurrence to a global replace — the type checker is what catches it, so run it before committing.
- **Prefer explicit paths to globs in `git rm` and `git add`.** A glob has no notion of "unrelated": it deleted three sibling route files that had nothing to do with the change, and a later commit had to restore them. Check `git show --stat` before pushing.
- **Never run a repo-wide formatter write (`prettier --write .`, `eslint --fix .`) in a repository that carries approval-gated files.** It rewrites them without a prompt. Pass explicit paths, and if one was touched, restore it from git and report it rather than keeping the change.
- **An agent-instruction file (AGENTS.md, CLAUDE.md, a rule file) that a write is blocked on is a finding, not an obstacle.** Do not route around the guard — propose the edit in the pull request or chat, and say plainly which gate is red and why.
- **Kill a dev server by port, not by pattern.** `pkill -f '<pattern>'` matches the shell command that contains both the pattern and the launch, and kills the session: use `fuser -k <port>/tcp`.
- **A build proves nothing about the layout it emitted.** List the output directory and confirm the pages you expected exist there before measuring.
- **Do not restate a design value in prose.** Point the documentation at the token or the table; two copies of a hex value are two things that can disagree.
- **Do not unify the file's line with the page's line just because they describe the same person.** They are
  different kinds of text, and a tidy sweep that makes them one string quietly swaps an agent's own standing
  rule for page copy — the edit the operator stops. The file states the policy, the page states the
  introduction, and both are allowed to be true at once.
- **An agent's own line belongs to that agent.** When the operator flags one as important, restore it
  character for character and leave the rest of the file alone; a paraphrase, even a better sentence, is the
  same mistake repeated.
- **When the operator hands you a format, touch only the fields it names.** "Follow this format … don't
  change the rest" means the bodies stay untouched — say in the report which fields you changed, so the
  untouched parts are auditable.

## Copy on a ported page

- **Propose the copy and wait for approval before changing it.** The operator asked to see it — landing an unconfirmed line costs a round of churn on a page under review.
- The remembered shape is two lines: **line 1 the role** (the same words as the person's/agent's role file, not a slogan), **line 2 one short first-person sentence** about what they do — casual, honest, under about fourteen words. Keep the line 1 wording identical to the role file, or the two sources disagree about what that role is.
- **Line 1 is the bare role.** A role file often titles itself with trailing traits (`Rapid innovator · bold · tries the newest`); the page shows the role words alone, which means the role file needs its own edit to match. When the operator says the first line is for the role, that is the instruction to drop everything after it — not to shorten the traits and keep one.
- **A duty that moves leaves somebody's line stale.** When a role changes hands — the product going to the human, say — an invented line that still claims it ("I pick the features…") contradicts the role file the same change is fixing. Ship neither silently: keep the operator's words, say which role the line now disagrees with, and offer two swaps that keep the joke.
- **The role's own document is part of the change, but it is not a copy of the page.** Its shape is the
  title — `# {Name} — {role}` — then **one italic sentence: the policy that agent lives by**, a standing
  principle about the craft (MeMe's is *Every line we add is debt, and code without tests is already
  legacy.*). That is not the page's line 2: the page line introduces the person, the file's line is the rule
  they work by, so the two are deliberately different strings and neither is derived from the other. Fix the
  body sentence that says what the role owns when a duty moves, and put the reviewer whose file it is on the
  review request.
- **Capitalise only the first word of a role label** (`Chief architect`, `Quality engineer`) — in the page
  and in the role file, so the two agree instead of each following its own habit.
- **The sibling lines are a set, so rewrite them together:** one length (roughly ten words), one register, and **positive** — no line about breakage, bugs, fixes, receipts or what something costs. A negative line is the one the operator rewrites, and one ideal line beside three stale ones reads as an accident rather than a house style.
- The second line is often also the page's `<meta name="description">`. Decide deliberately whether the joke carries into search, or the page keeps a plainer description.
- Own the recommendation: label the lines you invented as yours and the ones the operator gave, so a swap is one commit and not a re-review.

## Support files

- `references/sveltekit-cloudflare-parity.md` — platform notes: `_redirects` placement, trailing slashes, prerender output, per-route layouts, what to check after a build.
- `scripts/measure-page.mjs` and `scripts/wcag-contrast.mjs` ship with the `web-frontend-delivery` skill in this category, not with this one: run them from there (`node <path to web-frontend-delivery>/scripts/measure-page.mjs <url> [width] [height] [expressionFile]`).
