---
name: web-frontend-delivery
description: "Ship a built web front-end change and verify it renders."
version: 1.0.0
author: MiMi (thani-sh-mimi)
license: MIT
when-to-use: A change to a site or web app that ships as a build — routes, layouts, head/meta, copy, design tokens, fonts, host config.
metadata:
  hermes:
    tags:
      [
        frontend,
        web,
        verification,
        build,
        prerender,
        cloudflare-pages,
        design-tokens,
        smoke-test,
      ]
    category: software-development
    related_skills: [change-planning, github, testing, coding]
---

# Delivering a web front-end change

## When to Use

- A change to a site that ships as a build: routes, layouts, head/meta, copy, tokens, fonts, host config.
- A prerendered or server-rendered page, where the source can be right and the response still wrong.
- A site served from a **subpath** (GitHub Pages `/<repository>/`) or at a **domain root**. Settle which first: a subpath costs a base path in the app, the root costs nothing — `references/github-pages-project-site.md`.
- A content migration onto a live site (plan it with `change-planning` first).
- A page reproduced inside another codebase that must read as the original, which is still live.
- A **major-version upgrade**: migrate with `framework-major-migration`, verify here.
- A change to what an installed offline app keeps on the device — `references/device-storage-migration.md`.
- A small control on an existing screen: the ask is a feature, the risk is a redesign.
- Not for a change that ships nothing a browser fetches; the gate sequence covers it.

## The rule that carries the rest

**A green type-check, formatter and build are not evidence that a page renders.** A component that renders without its layout, its head or half its children still returns 200, still passes the checker, still builds. Serve the built artifact and read the response.

A prerendered `200` is not the whole check: the server's HTML can be right while the client replaces it with the framework's error page. The `curl` response and the painted page are two assertions.

## Changing a screen the operator already likes

The rejection to expect is "this changes the UI too much": it judges the shape, not the quality. The app has one primary job (the timetable, the list, the editor); everything else borrows a few pixels.

- **The existing screen stays the screen.** Put the new job inside it — a mark, a toggle, a count — not in a tab, a dock item or a route of its own. A feature ask never implies a new surface.
- **Disclose instead of adding.** Anything that can wait stays out of the first paint: a chevron that fades in on hover, a hint only in the empty state. What must be visible on touch gets the smallest mark that reads — a 12px circle on the row, not a card or a heading.
- **Keep the navigation and the gesture that already work.** A new control rides the surface the user already swipes. Replacing a pager with a menu reads as a regression.
- **Measure the delta.** At the same viewport, row tops and the columns' `x` are identical before and after the state change. A row that shifts is a change nobody asked for.
- **The first paint must look like the old page.** A `{#key}` block with `in:`/`out:` transitions animates the initial render. Gate it behind a `mounted` flag set in `onMount` and pass `{ duration: 0 }` until then.
- **A rejected shape is rebuilt on a fresh branch from the base branch**, not by stacking reversions. Close the superseded PR with one line naming what replaced it.

## What the page is for

A **project or product page sells what the thing is worth**; it does not document how it works. Event names, caps, record formats and queue rules answer "how", and belong in the product document or the repository. State the change in the reader's world: the hand-off removed, the waiting ended.

A mechanism converts into a **refusal**: "it never decides" is trust, which is value, and checkable. Keep the front page's summary as the pitch — one source per fact.

**A content rewrite is a layout decision.** A page built to document mechanisms has no section for the new argument. Re-decide the rhythm — benefit columns, split sections, a refusal list — instead of pouring value copy into the spec-sheet skeleton, and move the product and design docs' page-mode sentence in the same commit.

## Order of work

1. **Read the repository's own docs first** — `AGENTS.md`, `README`, the design and product docs. The gate commands, route table and house rules are written down and outrank your preference.
2. **Make the change in that shape:** content in its data module, copy in the dictionary, paths in the route table, colours in the stylesheet tokens, one route directory per page.
3. **Run the whole gate sequence on the final tree**, in the documented order, and read every result. The last command's exit code says nothing about the first.
4. **Build the production artifact.**
5. **Serve it the way production serves it** — the host's own emulator, not a generic static server. Wait for its ready line before the first request.
6. **Assert per route** (checklist below), including the negative: strings and addresses that must be gone.
7. **Confirm on the host's preview deployment** for the branch, with the same curls. The emulator is a proxy; the preview is the host's real build of your commit. When no preview exists, say so and name the URL that will carry it. To open the build sooner, serve it behind a quick tunnel: `references/quick-tunnel-preview.md`.
8. **When the change reproduces an existing page, measure both and diff the numbers.** Run `scripts/render-check.mjs` on both at the same phone viewport; pass an expression file when they do not share class names. **Read a differing row before touching it:** inherited drift is one box whose own rules did not change, while a _copy_ change re-centres everything below it — a sentence that wraps makes the block 22px taller and moves a centred heading 11px, which is not a layout bug. Do this on the preview build too.
9. **Open the PR with the evidence in the body, and keep the body true.** When the shape moves after the first push, rewrite the body rather than appending a comment that contradicts it. Verify the review requests landed — the `github` skill's PR-workflow reference has the read-back commands. When asked whether it is ready, answer with the state that decides it (mergeable, which check is red, what is pending) and the URL.

## The per-route assertion checklist

One pass over each route's response:

- **Status:** every intended route 200; an unknown path 404.
- **Browser:** headless Chromium leaves no console error, no framework error text (`500` / `Internal Error`) and no horizontal overflow at the narrowest width. `scripts/render-check.mjs` runs this pass.
- **Head and identity:** `<title>`, description and `rel=canonical` are _that page's own_; its h1, copy, section headings and empty states are present.
- **Links:** they point at the addresses you changed them to, and a grep for the old address returns 0.
- **Redirects and assets:** a slash variant returns the intended status; self-hosted fonts and images 200, right `content-type`, plausible size.
- **Origins:** `curl -s <url> | grep -oE 'https?://[a-z0-9.-]+' | sort -u` lists only intended origins — check the bundled CSS too, where a font URL lives.

## Pitfalls

- **Never kill a background server with `pkill -f "<command>"`.** The pattern matches the shell running the pkill, so the call dies with exit 143 and looks like a crash; a bracketed pattern does not save you when the same line holds the literal invocation. Start the server in the terminal tool's background mode and kill by pid: `ps -eo pid,args | grep "http.serve[r]"`, then `kill <pid>`. The same self-match catches a `ps … | grep "<script>" | xargs kill` pipeline whose launch sits in the same line — resolve the pid in one call, kill in the next. **`fuser` is not installed here**: `fuser -k 8788/tcp` reads as success while killing nothing, so check the port after.
- **A red gate is not automatically yours.** Check the base branch: `gh run list -R <owner>/<repo> --branch main --limit 5`. Report a pre-existing failure with its run link; do not fix it here.
- **A pattern-based rewrite or delete widens past your intent.** A repo-wide formatter `--write` rewrites files outside your diff, including instruction files; a glob in `git rm`/`mv` (`src/routes/*/+page.ts`) takes unrelated siblings. Name the paths, read `git status` after, format only changed files. A refused write on an instruction file is never routed around — restore it and report it. A plain string replace is no safer: replacing `'log: x'` removes the first same-named key in the file. Edit with surrounding context or a patch tool.
- **A row of fixed-size items is a breakpoint decision, not a `flex-wrap` accident.** Four 92px portraits with labels need ~400px against the 342px a shell has at 390px; left to wrap, the row gives three items and a stray fourth. Measure the narrowest width, choose the column count (a 2×2 grid), and hand the operator the consequence. **Spread that row with `space-around`, not `space-between`:** `space-between` pins the outer two to the edges. Verify two numbers: `first.x - row.x` equals `row.right - last.right`, neither 0.
- **A value above its label is a row order, not a reversed column.** `column-reverse` on a stretched grid item packs its content to the bottom, so a one-line label drops its number to another baseline. Keep the DOM order (`dt` then `dd`) and lift the value with `order: -1`, or use a two-row grid. Compare the value box's and the label box's `y` across every column, at both widths.
- **A one-word last line in a narrow column is a line-breaking problem before a copy problem.** `text-wrap: pretty` rebalances the final lines (Chromium; older engines fall back). Never on headings — there `balance` is the tool.
- **A preview server left from an earlier build serves that build's shell.** `vite preview` answers `/` from the index it loaded and 404s the new chunk hashes, so the page arrives with no app and the console says `Failed to fetch dynamically imported module`. Restart after **every** build; `--strictPort` then refuses the port the old process holds, so use a new one. A service worker does the same on reload — drive checks with `Network.setBypassServiceWorker { bypass: true }` and a fresh `--user-data-dir`.
- **Run the render check before you commit.** Fix what it catches in the same commit.
- **A keyed `{#each}` needs a key unique per item, and a repeat fails at hydration, not at build.** Two entries keyed on a shared field throw `each_key_duplicate` and the page becomes `500 Internal Error`, with type check, formatter, tests, build and prerendered HTML all green. Key on the field that differs.
- **A page you are about to rewrite may have moved, including on your own branch.** Check `git log origin/<branch>..HEAD` and the PR's `headRefOid` against the local head, then re-read the page and the copy it prints.
- **Swapping a hand-drawn glyph for an icon component breaks CSS the checker calls "unused".** The set ships `fill="none"` as an attribute, so `svg { fill: currentColor }` overrides it and every icon renders as a solid blob; delete the fill rule and keep `display: block`. A descendant selector (`.row svg`) stops matching once the `<svg>` lives in a child component — `svelte-check` reports `Unused CSS selector`, so scope it `:global(svg)`. Prove the bundle kept only imported icons by grepping the build for an unused icon's path data (0 files): `references/icon-sets.md`.
- **An ask for an installable app, when the change only exists on the web, is answered with the gap and a link — never a build of the untouched native app.** Say which clients hold the work, what a port would cost, and what the API needs first. Then hand over the web app through a quick tunnel: a PWA install is the same feature with no build.
- **A ground or surface token is a documented fact, not a local edit.** Recompute every contrast figure the repository publishes in the same commit — `references/design-tokens-and-contrast.md`. Never let a surface fill equal the ground's lightest stop: the card vanishes at 1.00:1 while every text tier still passes.
- **When the host app's global CSS is inherited, a ported page drifts by a few pixels without one ported rule changing.** A global `body { line-height: 1.55 }`, a `* { margin: 0 }` reset the original had and the host does not, a heading with no `line-height` (36px where `1.1` gives 31px at phone width). Reset `line-height` and margins at the ported root; find the rest with the measured diff.
- **A ported page keeps the original's page boundaries and its own chrome.** Do not fold two pages into one, and do not put the host's top bar, nav or footer on a page a visitor compares against the original. Shared chrome belongs in a per-instance layout.
- **Take the geometry from the original and the copy from the source of truth.** An imported site's text ages faster than its layout: roles and taglines describe a job the entity may no longer do. Port its structure, accents, portraits and type sizes, and re-derive every sentence.
- **A removed line or link orphans its data.** The dictionary string, the field behind it and any URL derived from it stop being read: grep each one, delete the dead ones in the same change, and say which fields went.
- **Measure what is measurable before conceding a gap.** Status codes, DOM, computed styles, geometry, contrast and bundle origins are checkable from a shell. What stays unverified is the rendered image; name that line.
- **Removing a page means removing everything that pointed at it.** The route table key, the nav entry, the section component, the dictionary strings it owned, links from other pages, the page list in the product doc. Grep each name — a surviving link to a deleted path ships a 404.
- **A second page class mirrors the one beside it, and the router's own test has to be widened with it.** Copy the existing shape: a directory per instance whose `+layout.ts` loads the entity by the one literal key it names, `+layout.svelte` for chrome, `+page.svelte` for content, the path built in the route table, never inline. The suite that asserts route directories against that table fails until the new keys join it — widen it and add the per-instance checks in the same commit, and move the docs' screens and route sentences with it.
- **A list entry that describes the page it sits on has no destination.** Do not ship a self-link: ask which way it should go (its own page, its repository, or off the list). That decides whether the data keeps a `path`, and the dictionary entry for a dropped row goes with it.
- **Never publish a status, badge or category the visitor cannot check.** "Active", "shipped" and "internal" age the moment they are written; the repository is the record. When the operator drops one, drop the field behind it in the same change.
- **"Make the whole row clickable" is one anchor around the row, not a stretched pseudo-element.** A `::after` overlay covers the row but blocks text selection and leaves the focus ring on the icon. Wrap the row's content in the anchor, move the divider onto it (`border-top` on the anchor, not the `li`), and label the anchor with the row's name plus the action (`Dispatch — the code`) — or `aria-labelledby` the name span when the row opens an on-site page. Hover belongs on the row then. Verify by hit test — `page-geometry-cdp`'s `scripts/link-coverage.mjs <url> <row-selector>` — never by reading the CSS.
- **An operator's change to an element's behaviour can falsify a design sentence, and fixing that sentence is part of the change.** Rewrite that one line in the same commit and name it in the PR body; rewriting the section around it is scope creep. Say the doc line moved and offer to revert it. The same holds when an ask widens a page's scope.
- **Copy a person will read is proposed, not landed.** Titles, role lines and taglines are the operator's words: send the exact strings with alternatives before the commit. When the operator leaves the copy question open, build to the proposed strings, quote them verbatim in the PR body and reply, and say they are yours to change.
- **Do not add a fact, a rule or a section to a document nobody asked you to change.** Offer the line; do not add it. "True and useful" is not the test, the operator's ask is. On request, revert it in a commit of its own.
- **A drag that ends over a tappable row fires a click on it.** Record the travel distance on `pointerdown`→`pointerup`, and ignore taps for ~350ms after a drag longer than ~8px, then assert both halves in the browser. A tolerance in CSS px is not the guard: the click is dispatched after the pointer is released, so only a time gate catches it.
- **A tap target inside a row must not change the row's height.** A marker in the time column keeps the baseline and the columns still; one on its own line, a badge above the label or a border on the row moves every sibling and is a redesign.

## References

- `references/sveltekit-cloudflare-pages.md` — prerender output, `_redirects`, trailing slashes, the emulator, the preview.
- `references/icon-sets.md` — stroke and size at 16px, brand marks, the `fill` and scoping traps, tree-shaking.
- `references/design-tokens-and-contrast.md` — another design's ground, the worst-case surface, the panel rule.
- `references/github-pages-project-site.md` — root versus `/<repository>/`, the base path, `CNAME`, the DNS switch.
- `references/quick-tunnel-preview.md` — a link the operator can open when the host builds only the default branch.
- `references/product-page-value-copy.md` — the value-first page: argument order, copy rules, layout checks.
- `references/device-storage-migration.md` — seed version, orphaned rows, the user's own row, transactions, a versioned key.
- `scripts/contrast.ts` — ratio and panel calculator: `bun run scripts/contrast.ts <text-hex> <surface-hex> [...]`.
- `scripts/render-check.mjs` — Chromium over CDP: console errors, the `500` page, horizontal overflow, `<h1>` and section boxes, a screenshot. `node scripts/render-check.mjs <url> [width] [out.png] [expressionFile]`, with `CHROME=` for a non-default binary. It attaches to `about:blank` and navigates after enabling `Runtime`, or the hydration errors are gone before the listener attaches.
