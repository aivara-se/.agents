---
name: web-frontend-delivery
description: "Ship a built web front-end change and verify it renders."
version: 1.0.0
author: MiMi (thani-sh-mimi)
license: MIT
when-to-use: A change to a site or web app that ships as a build — routes, layouts, head/meta, copy, design tokens, fonts, host config (SSR or prerendered site, worker, static export, Cloudflare Pages or similar).
metadata:
  hermes:
    tags: [frontend, web, verification, build, prerender, cloudflare-pages, design-tokens, smoke-test]
    category: software-development
    related_skills: [change-planning, github, testing, coding]
---

# Delivering a web front-end change

## When to Use

- A change to a site or web app that ships as a build: routes, layouts, head/meta, copy, design tokens, fonts, host config.
- A change to a prerendered or server-rendered page, where the source can be right and the response still wrong.
- A site that has to be served from a **subpath** (a GitHub Pages project site under `/<repository>/`) or at the **root of a domain** behind a CNAME, or from a second host while the domain moves: which one is the target is the first thing to settle — a subpath is work in the app (a base path), the root is none — see `references/github-pages-project-site.md`.
- A design or content migration onto an existing site, where the ground, the accents and the copy all move at once (plan it with `change-planning` first).
- A page or a whole site reproduced inside another codebase, where the result has to read as the original: the original is still live, and it is the reference you measure against.
- A framework or dependency **major-version upgrade** that has to keep rendering the same: run the migration with `framework-major-migration`, then verify the result here.
- A change to what an installed offline app keeps on the device — IndexedDB rows, a merged content file, a stored choice — where the devices already carrying the old shape are the ones that break: `references/device-storage-migration.md`.
- Not for a change that ships nothing a browser fetches — a docs-only or data-only change is covered by the gate sequence alone.

## The rule that carries the rest

**A green type-check, a green formatter and a green build are not evidence that a page renders.** Every change to a route, a layout, a head block or a colour is verified by serving the built artifact and reading the response — because a component that renders without its layout, its head or half its children still returns 200, still passes the type checker, and still builds. The failure is invisible in the source and obvious in the response body. A prerendered `200` is not the whole check either: the server's HTML can be correct while the client replaces it with the framework's error page, so the response `curl` reads and the page a browser paints are two separate assertions.

## What the page is for

Settle the page's job before writing a sentence. A **project or product page sells what the thing is worth**; it does not document how it works. The operator's test is the visitor's: event names, caps, record formats, queue rules and other internals answer "how", and a reader who will never open the repository does not care — they are mechanism, and they belong in the product document or the repository. The page states the change in the reader's world: the hand-off removed, the waiting ended, the judgement left where it belongs. Facts earn a place when they argue (agents in the loop, hand-offs by hand, decisions made for them), not when they document (rounds, audit fields).

A mechanism worth keeping usually converts into a **refusal**: "it never acts", "it never decides", "it never keeps a queue" is trust, which is value, and it is checkable. Keep the front page's one-line summary as the short pitch — one source per fact — and let the headline, the sections and the closing CTA argue around it.

**A content rewrite is a layout decision.** Sections exist to carry an argument, and a page built to document mechanisms (an event table, a record grid) has no section for the new argument. Re-decide the rhythm — benefit columns, split heading/content parts, a two-column refusal list — instead of pouring value copy into the old spec-sheet skeleton; an operator who asks for the rewrite will usually let the layout move with it. Then move the product and design documents' page-mode sentence in the same commit, because a page that stopped describing construction is no longer the page they describe.

## Order of work

1. **Read the repository's own docs first** — the entry file (`AGENTS.md`), `README`, and the design/product docs. The gate commands, the route table, the house rules and "one source per fact" are usually already written down and outrank what you would have chosen. Do not restructure what the repository documents on purpose.
2. **Make the change in that shape:** content in its data module, copy in the dictionary, paths in the route table, colours in the stylesheet tokens, one route directory per page.
3. **Run the whole gate sequence on the final tree**, in the order the repository documents it, and read every result. The exit code of the last command says nothing about the first.
4. **Build the production artifact.**
5. **Serve it the way production serves it** — the host's own emulator, not a generic static server. Wait for its ready line before the first request.
6. **Assert per route** (checklist below), including the negative: strings and addresses that must be gone.
7. **Confirm on the host's own preview deployment** for the branch, with the same curls. The local emulator is a proxy; the preview is the host's real build of your commit, and it is the evidence a reviewer can open. When no preview exists — the host is not serving this commit yet, or the host builds only the default branch — say that plainly and name the URL that will carry it, instead of implying the artifact was seen live. If the operator wants to open it before that URL exists, serve the build behind a quick tunnel and verify through the tunnel: `references/quick-tunnel-preview.md`.
8. **When the change reproduces a page that already exists, measure both and diff the numbers.** Run `scripts/render-check.mjs` against the page the change replaces and against the new one at the same phone viewport, and compare the value sets as a table. Pass an expression file as the last argument when the two pages do not share class names. **Read a differing row before touching it:** inherited drift appears as one box whose own rules did not change (a taller line box, a margin the host sets and the original reset), while a *copy* change re-centres everything below it — a sentence that wraps to two lines makes the block 22px taller and moves a centred heading 11px, which is not a layout bug. Do this on the preview build as well, so the numbers describe the artifact under review.
9. **Open the PR with the evidence in the body, and keep the body true.** It is the artifact a reviewer reads: when the shape moves after the first push (a page boundary restored, a link removed, a decision reversed), rewrite the body rather than appending a comment that contradicts it. Then verify the review requests landed — the `github` skill's PR-workflow reference has the read-back and repair commands. When the operator later asks whether it is ready or asks for the link, answer with the state that decides it (mergeable, which check is red and whether it blocks the merge, what is still pending) and the URL — the link itself, not a re-run of the report.

## The per-route assertion checklist

For each route, in one pass over the response:

- **Status:** every intended route 200; an unknown path 404.
- **Browser:** loading the route in headless Chromium leaves no console error, no framework error text (`500` / `Internal Error`) and no horizontal overflow at the narrowest supported width. `scripts/render-check.mjs` runs this pass and reports the section boxes.
- **Head:** `<title>`, description and `rel=canonical` are *that page's own*, not the site default.
- **Identity:** the page's h1, its own copy, its own section headings and its empty states are present — not just the shared shell.
- **Links:** they point at the addresses you changed them to, and a grep for the old address or domain returns 0.
- **Redirects:** a slash variant returns the status you intended to the canonical path.
- **Assets:** self-hosted fonts and images 200, right `content-type`, plausible size.
- **Origins:** `curl -s <url> | grep -oE 'https?://[a-z0-9.-]+' | sort -u` lists only origins you intend — check the bundled CSS too, since a font or script URL lives there rather than in the HTML.

## Pitfalls

- **Never kill a background server with `pkill -f "<the command you started>"`.** The pattern matches the shell running the pkill, so the tool call dies with exit 143 and looks like a crash. A bracketed pattern (`"wrangler pages de[v]"`) does not save you when the same command line also contains the literal invocation later on — which is the normal shape, since one call starts the server and the next stops it. Start the server with the terminal tool's own background mode, and kill it by pid: `ps -eo pid,args | grep "http.serve[r]"` then `kill <pid>`. **The same self-match catches a `ps … | grep "<script>"` pipeline ending in `xargs kill`** when the launch sits in the same command line — the shell's own argv contains the pattern — so resolve the pid in one call and `kill <pid>` in the next. **`fuser` is not installed in this sandbox**, and a `fuser -k 8788/tcp 2>/dev/null` reads as success while killing nothing — check the port afterwards (`curl -s -o /dev/null -w '%{http_code}'` must fail) instead of trusting the exit code.
- **A red gate is not automatically yours.** Before owning or fixing it, check the base branch: `gh run list -R <owner>/<repo> --branch main --limit 5`. Report a pre-existing failure with its run link, and do not absorb a fix for it into an unrelated change.
- **A pattern-based rewrite or delete widens past your intent, and never clears a gate.** A repo-wide formatter `--write` rewrites files outside your diff — including instruction files you must not edit deliberately — and a glob in `git rm`/`mv` (`src/routes/*/+page.ts`) takes the unrelated siblings with it. Name the paths, read `git status` after, restore whatever you did not mean to touch, and format only the files you changed: reformatting the repository is not a fix for a red formatting gate. If a write is refused because the file is an instruction file, never route around the refusal with a shell or the formatter — restore it and report it. A plain string replace is not safer than a glob: replacing `'log: x'` removes the first same-named key anywhere in the file, which may be a different section than the one you meant. Edit with the surrounding context or a patch tool, and let the type checker name what the edit broke.
- **A row of fixed-size items is a breakpoint decision, not a `flex-wrap` accident.** Items at the size the original uses may not fit the narrowest viewport the site supports — four 92px portraits with their labels need roughly 400px against the 342px a shell has at 390px — and left to wrap, the row gives three items and a stray fourth. Measure the narrowest width, choose the column count deliberately under a breakpoint (a 2×2 grid), and hand the operator the consequence and the alternative (letting the item shrink under that breakpoint) instead of shipping the accident. **Spread that row with `space-around`, not `space-between`:** an operator asking for "the space around" wants the same room on both sides of every card, while `space-between` pins the outer two to the edges. Verify it as two numbers — `first.x - row.x` should equal `row.right - last.right`, and neither should be 0.
- **A value above its label is a row order, not a reversed column.** `flex-direction: column-reverse` on a grid item that stretches to the row's height packs its content against the bottom, so a one-line label beside two-line labels drops its number to a different baseline — the columns look randomly misaligned. Keep the DOM order (`dt` then `dd`, or label then value) and lift the value with `order: -1` on a normal column, or use a two-row grid. Prove it as numbers: compare the value box's and the label box's `y` across every column, at the widest and narrowest widths, rather than reading the CSS.
- **A one-word last line in a narrow column is a line-breaking problem before it is a copy problem.** `text-wrap: pretty` on short body copy lets the browser rebalance the final lines (Chromium; older engines fall back to normal wrapping), so a paragraph ending on "middle." or "theirs." can be fixed without rewriting a sentence the operator approved. Re-wrap after the copy changes; do not use it on headings, where `balance` is the tool.
- **A preview server left running from an earlier build serves that build's shell.** `vite preview` (and every emulator that reads a manifest at start) keeps answering `/` from the index it loaded and 404s the new chunk hashes, so the page arrives with no app and the console says `Failed to fetch dynamically imported module` — which reads as a broken build. Restart the server after **every** build, and expect `--strictPort` to refuse the port because the old process still holds it: give the new one a new port rather than assuming the old one died.
  The service worker is the same trap on a reload: it can answer the navigation from the previous build's precache, so drive checks with `Network.setBypassServiceWorker { bypass: true }` (and a fresh `--user-data-dir`) instead of trusting what a reload shows.
- **Run the render check before you commit, not after.** A bug the response catches is fixed in the same commit; a follow-up "fix: the page I just added" commit is noise you chose to create.
- **A keyed `{#each}` needs a key that is unique per item, and a repeat fails at hydration, not at build.** Two entries keyed on a field they share — the same repository parsed out of two wake sentences — throw `each_key_duplicate` while the client hydrates, and the whole page is replaced by the framework's `500 Internal Error`. The type check, formatter, tests and build all pass, and the prerendered HTML `curl` reads is correct, so only a browser pass catches it. Key on the field that differs (the sentence), not on the token both share.
- **A page you are about to rewrite may have moved since you last read it, including on your own branch.** In a shared repository another session or a reviewer can land commits on `main` or directly on the branch you are working: check `git log origin/<branch>..HEAD` and the pull request's `headRefOid` against the local head before rewriting or pushing, then re-read the target page and the copy it prints. Rewriting from the copy in your context clobbers a fix a reviewer already approved, and the diff makes it look like your change.
- **Swapping a hand-drawn glyph for an icon component breaks CSS the checker calls "unused".** The set
  ships `fill="none"` as an attribute, so a container rule like `svg { fill: currentColor }` overrides it
  and every icon renders as a solid blob; delete the fill rule and keep only `display: block`. A descendant
  selector (`.row svg`) also stops matching once the `<svg>` lives inside a child component — `svelte-check`
  reports `Unused CSS selector`, which is the markup telling you to scope it `:global(svg)`. Prove the
  bundle kept only the icons imported by grepping the build for an unused icon's path data (0 files), and
  quote that when the dependency lands: `references/icon-sets.md`.
- **A ground or surface token is a documented fact, not a local edit.** Recompute every contrast figure the repository publishes in the same commit — see `references/design-tokens-and-contrast.md`.
- **Never let a surface fill equal the ground's lightest stop:** the card vanishes at 1.00:1 while every text tier still passes its own check.
- **When the host app's global CSS is inherited, a ported page drifts by a few pixels without one ported rule changing.** A global `body { line-height: 1.55 }`, a `* { margin: 0 }` reset the original had and the host does not, a heading with no `line-height` of its own (36px where an explicit `1.1` gives 31px at phone width) all move the composition. Reset `line-height` and margins at the ported page's root, and find the rest with the measured diff rather than by reading the CSS.
- **A ported page keeps the original's page boundaries and its own chrome.** Do not fold two original pages into one (a front page and its log, an index and its detail), and do not put the host app's top bar, nav or footer on a page a visitor compares against the original — the comparison is of the whole page, header included. Chrome the original's pages share belongs in a per-instance layout, so a later split is one move instead of a re-cut.
- **Take the geometry from the original and the copy from the source of truth.** An imported site's text ages faster than its layout: roles, taglines and `about` lines describe a job the entity may no longer do, so port its structure, accents, portraits and type sizes, and re-derive every sentence from the document that owns that fact now. This is what makes the measured diff readable — the rows that move are the ones the new copy moved.
- **A removed line or link orphans its data.** When the operator trims an element, the string in the dictionary, the field behind it and any URL derived from that field stop being read: grep for each one and delete the dead ones in the same change, or the content table keeps publishing a fact the site no longer shows. Say which fields went, so the next reader does not look for them.
- **Measure what is measurable before conceding a gap.** Status codes, DOM, computed styles, element geometry, contrast and the bundle's origins are all checkable from a shell, and `scripts/render-check.mjs` returns exact boxes from a real browser. What normally stays unverified is the rendered image itself; name that one line rather than implying nothing can be checked.
- **Removing a page means removing everything that pointed at it.** A route is more than its directory:
  the route table key, the nav entry, the section component that rendered it, the dictionary strings it
  owned (its lede, its nav label), the link on another page that led there, and the page list in the
  product doc. Grep each name across the tree before calling the removal done — a surviving link to a
  deleted path ships a 404 on the one page you did not re-read.
- **A second page class mirrors the one beside it, and the router's own test has to be widened with it.**
  When the site already has one page type with per-instance routes (an agent at `/<agent>/`) and the ask
  is a second (`/<project>/`), copy that shape instead of inventing one: a directory per instance whose
  `+layout.ts` loads the entity by the one literal key it names, `+layout.svelte` for the chrome,
  `+page.svelte` for the content, and the path built in the route table, never inline. The suite that
  asserts the route directories against that table fails until the new keys join it — that failure is the
  map telling you the second half of the change, so widen it and add the per-instance checks (directory
  exists, key written once, path matches the table) in the same commit. The product and design docs'
  screens, modes and route sentences move with it, or they describe a site that no longer ships.
- **A list entry that describes the page it sits on has no destination.** A project row whose "page" is
  the site itself becomes a link back to the page the visitor is already on. Do not ship a self-link:
  ask which way the entry should go (its own page, its repository, or off the list) — the answer decides
  whether the data keeps a `path` at all, and the dictionary entry for a dropped row goes with it.
- **Never publish a status, badge or category the visitor cannot check.** "Active", "shipped" and
  "internal" age the moment they are written and a reader cannot tell a stale one from a true one; the
  repository is the record. When the operator drops one, drop the field behind it in the same change (see
  the orphaned-data pitfall above) and say which fields went.

- **"Make the whole row clickable" is one anchor around the row, not a stretched pseudo-element.** A
  `::after` overlay on the small link does cover the row, but it blocks text selection and leaves the
  focus ring on the 16px icon. Wrap the row's content in the anchor, move the row's divider onto it
  (`border-top` on the anchor, not the `li`) so the hairline belongs to the hit area, and label the
  anchor with the row's name plus the action (`Dispatch — the code`) — or `aria-labelledby` the name
  span when the row opens an on-site page, which makes the name the link's name and leaves the summary
  readable outside it — the icon's own label goes away
  with the icon-only link, and one anchor per row is what a screen reader's link list should show.
  Hover belongs on the row then (brighten the name and the mark). Verify by hit test — the anchor's box
  against the row's, plus a probe at each corner — never by reading the CSS: `page-geometry-cdp`'s
  `scripts/link-coverage.mjs <url> <row-selector>` runs exactly that.
- **An operator's change to an element's behaviour can falsify a design sentence, and fixing that
  sentence is part of the change.** When the ask ("make the whole row clickable") contradicts a line the
  design doc still asserts ("the mark is the link's only visible part"), rewrite that one line in the
  same commit and name it in the PR body beside what it replaced; rewriting the surrounding section is
  scope creep, and leaving it makes the doc describe a page that no longer ships. Say in the reply that
  the doc line moved and offer to revert it, so the operator can keep the document untouched if they
  prefer.
  The same holds when the ask widens a page's scope: a product doc that fixes a page as "a name and one sentence" moves in the same commit as the page that outgrew it, and the reply names the sentence that changed.
- **Copy a person will read is proposed, not landed.** Titles, role lines, taglines and every sentence that
  faces a visitor are the operator's words, not an implementation detail: send the exact strings with the
  alternatives and let them pick *before* the commit, and expect line-by-line iteration (the first word's
  casing, length, tone) after it lands anyway. Copy is free to change before a push and costs a review round
  after one, and a sentence you invented reads as a decision you made for them. Requiring the answer must
  not stall the build: when the operator answers the structural questions and leaves the copy one with a
  question of their own, build to the proposed strings, quote them verbatim in the PR body and in your
  reply, and say they are yours to change — a round trip over one sentence costs more than the edit after
  it lands.
- **Do not add a fact, a rule or a section to a document nobody asked you to change.** When the work teaches
  you something the repository's own docs ought to say — the format of a file you just wrote, a rule you had
  to derive, a fact a reader would find useful — offer the line; do not add it. "True and useful" is not the
  test, the operator's ask is, and an unasked paragraph in a `README` reads as scope creep even when it is
  correct. On request, revert it in a commit of its own and say the file is back to what it was.

## References

- `references/sveltekit-cloudflare-pages.md` — the SvelteKit + Cloudflare Pages shape: prerender output, `_redirects` location and syntax, trailing slashes, the local emulator and the Pages preview.
- `references/icon-sets.md` — adopting a component icon set (Lucide on Svelte): package and per-icon imports, stroke and size calibration at 16px, brand marks the set does not carry, the `fill` and scoping traps, and proving tree-shaking from the build.
- `references/design-tokens-and-contrast.md` — adopting another design's ground, measuring contrast against the worst-case surface, and the panel rule for cards.
- `references/github-pages-project-site.md` — GitHub Pages as the host: root-of-a-domain versus `/<repository>/` and which one costs a base path, trailing slashes, why a committed `CNAME` does not configure the domain, the DNS switch, and how to verify the artifact the way the host serves it.
- `references/quick-tunnel-preview.md` — a link the operator can open when the host builds only the default branch: serve the built artifact on loopback, `cloudflared tunnel --url`, read the hostname from the log, and verify the routes and assets through the tunnel before sending it.
- `references/product-page-value-copy.md` — the value-first project page: the argument in order (headline, arguing facts, benefit columns, principle, refusal ledger, why, CTA), the copy rules, and the layout checks that go with it.
- `references/device-storage-migration.md` — reshaping what an installed offline app keeps on the device: the seed version, orphaned rows, never shipping over the user's own row, transactions that auto-commit across an `await`, a versioned settings key, and how to prove an upgrade path in a browser.
- `scripts/contrast.ts` — ratio and composited-panel calculator: `bun run scripts/contrast.ts <text-hex> <surface-hex> [...]`.
- `scripts/render-check.mjs` — the browser pass for a built page (Chromium over CDP, no dependencies): console errors and uncaught exceptions, the framework's `500 / Internal Error` page, horizontal overflow, `<h1>` and section boxes, and a full-page screenshot. `node scripts/render-check.mjs <url> [width] [out.png] [expressionFile]`, with `CHROME=` when the binary is not where it looks. It attaches to `about:blank` and navigates after enabling `Runtime`, or the hydration errors are already gone before the listener attaches. Run it against the page a change replaces and against the new one, then diff.
