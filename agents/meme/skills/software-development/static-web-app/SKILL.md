---
name: static-web-app
description: Use when building or checking a no-build browser app.
author: MeMe
license: MIT
when-to-use: Any small browser app with no build step — writing or changing it, serving it locally, checking its behaviour in a real browser, making it work offline, or putting it in front of the user to look at.
metadata:
  hermes:
    tags:
      [
        web,
        static-site,
        service-worker,
        playwright,
        browser,
        pwa,
        offline,
        tunnel,
      ]
    category: software-development
    related_skills: [dogfood, coding, testing]
---

# Static web app

The app is committed files the browser loads directly — no bundler, no build. This is how to run it, check it in a real browser, keep it working offline, and let the user see it.

## When to use

- Writing or changing it (HTML/CSS/JS served as committed files), or serving it locally.
- Checking it in a real Chrome.
- Making it work offline (service worker, PWA manifest).
- Putting it in front of the user to check himself.

## Serve it

- Write a tiny static server as a Bun script under `scripts/`, run with `bun run scripts/<name>.ts` (Bun for scripts — never Python or shell). `templates/static-server.ts` is a ready copy.
- Map the root **before** choosing the content type: `if (path === "/") path = "/index.html"`, then read the type from that final path. Backwards, `/` is served as `application/octet-stream` and the browser downloads the page — while every DOM-level check still passes, because they fetch the document, not the tab.
- Check status **and** content type for `/` and every asset: `curl -sS -o /dev/null -w '%{http_code} %{content_type}\n' <url>`. `text/html` for `/`, `text/javascript` for modules, `application/json` for a seeded data file, the media type for audio and images.

## Verify in a real browser

- Have a browser: `bun add -g playwright && playwright install chromium`. Check first whether the machine already has them — a global install can exit 0 having downloaded nothing because the browsers sit under a different `PLAYWRIGHT_BROWSERS_PATH`. Launch with `--no-sandbox` as root; a headed window needs `Xvfb :99 -screen 0 1280x800x24` and `DISPLAY=:99`. Harness setup: `references/browser-checks.md`.
- Send real key events (`page.keyboard.down/up/press`), so the app's handlers and the browser's repeat flag are exercised. One exception: the driver pins `key` to its table — `press("A")` arrives as `key: "a"` — so a `key` that differs between keydown and keyup needs a dispatched `KeyboardEvent` per event.
- Measure timings **in the page**, never across the driver boundary. Assert **geometry** with `getBoundingClientRect()`; number-and-position claims never come from a picture. Screenshots are for the user.
- **Sound is not in the DOM**: count `HTMLMediaElement.prototype.play` calls to turn a spoken-behaviour claim into a check.
- A screenshot _can_ be read into `vision_analyze` with a narrow question. It is a rough design eye, not a ruler: it says "cramped" forever and its pixel estimates are noisy, so measure the concept's proportions and match those numbers.
- It is a poor ruler but a good **defect sensor**. When it describes something structurally odd — an emoji with no word beside it, a chip it calls cut off — go measure; one flagged a chip split across a line break that every geometry check passed, and `getClientRects()` confirmed it.
- **Vision can be gone for a whole session.** `vision_analyze` can refuse every image with `ModelProtocolUnsupported`, so never plan a design review around it. The DOM carries it: `getBoundingClientRect()` plus computed `fontSize`/`fontWeight`/`letterSpacing`/`color` gives fold positions, the rendered type scale, the spacing rhythm and the colour tiers.
- Collect `console` errors and `pageerror` as a check of their own, and reload with the network off.
- Test the **returning visitor**, not a fresh tab — a fresh profile always passes.

## Offline and the service worker

Precache the shell and bump the cache name in the same commit as any shell file; the trap is the **update path**, where a returning device keeps the old copy. Rules in `references/service-worker.md`.

## A store on the device

- **Seed from files that ship, then read only the store.** Keep built-in data as JSON (one file per record, plus an index naming them in order), read it in on a first run, then read the store. The store becomes the copy the app draws from, the user's edits included.
- **Precache the seed files with the shell.** A first run with the network off has no data unless they are cached. Every file the app fetches to boot belongs in the shell list.
- **Carry a seed version.** Store a version beside the data and re-seed when it moves; that is how a shipped record reaches a device that has a store — and it discards the user's edits, so say so.
- **Draw the state that arrives late.** The first paint happens before an async read lands.
- **Write back only the record that changed.** Make the update helpers pure and return the _same object_ for every record untouched; the caller finds the changed record by identity. Assert the identity in a unit test — nothing else fails loudly when it stops holding.
- **A picture is a data URL, capped on the way in.** Scale the long edge to about 512px and keep it on the record: no object URLs to revoke, and a screen rebuilt on every keystroke stays small.
- **An editor owes the user undo.** An add-only editor for curated content leaves a wrong entry stuck, and the only escape is the nuclear reset. Pair the add with a remove, and a destructive reset with a two-tap confirmation, not a dialog.

## Share it

`cloudflared tunnel --url http://localhost:<port>` prints an `https://…trycloudflare.com` URL (install with `curl -fsSL -o /usr/local/bin/cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 && chmod +x /usr/local/bin/cloudflared`). Run it as a tracked background process, then curl the public URL for `/` and each asset. The URL lives only while the tunnel process does.

- **Close it when the task ends, and prove the close.** The URL stays in the chat, so an open tunnel is a live hole: kill the tunnel and the static server, then probe both — the local port refuses and the public URL answers **530**.
- **Kill by PID, never by a pattern your own command line contains.** `pkill -f "bun run serve.ts"` matches the shell running it, so it kills your terminal (exit 143) before the server. Take PIDs from `pgrep -f "[s]erve.ts"` — the brackets keep the pattern out of your own command line.
- **The process tool's report is not proof of shutdown.** A session can read as exited (`backend_lost`) while the port still answers; probe the port and the public URL.

## Rules this user holds

- **Input is append-only: never edit what the user typed, however nonsensical.** A spec rule that works only by rewriting entered text is dropped, and you say so. When fast typing must not be read aloud, write every character at once and **debounce the sound**; silence the accessory, never the text.
- A case change is a **display** change: `text-transform: capitalize` leaves `textContent` as typed, so a check can assert both halves. Never let a display rule rewrite or "correct" text. Draw a chip's emoji with `content: attr(data-emoji)` and its colour from `[data-color]`, so the DOM holds only the typed text; an `<img>` prepended into the chip carries no text either. Keep the shape in the stylesheet, never the data: a picture is stored as uploaded and drawn as a circle by CSS, so a shape change costs one stylesheet value.
- **Show each fact once in a row.** A preview chip and an editor field for the same value read as a duplication bug, and a grey placeholder among ink reads as disabled. The field is the display; a picture's thumbnail is the only extra thing.
- **Colour is data, not taste, and never the only signal.** The chain is the item's own value, else the colour of what it depicts, else its group's, else the default ink — with a **live** last step (one group with no colour), so the app exercises the default. A check reads the tokens from the CSS, computes contrast in the page, and fails under 4.5:1. The outline carries the mark.
- **Curate the colour of a depicted thing; do not sample the picture.** Skin tones and warm neutrals win a pixel count, so a robot and an open book both come out "orange". Decide from what the thing **is** — an apple red, a frog green — leave out items whose picture says nothing, and say the map was curated by meaning.
- **A bright pictograph colour rarely clears 4.5:1 on white, so it ships darker than the thing it depicts**: a banana's yellow becomes a dark gold that reads as tan. Legibility wins on a near-white surface; say which way you resolved it.
- The repo's spec docs are authoritative. Surface a conflict and get the decision first; when he overrules a document, rewrite **that document** in the same change.
- **A documentation link he sends is a request, not a specification of the mechanism.** Much of `chrome.*` works only inside an extension: when the API does not apply to a served page, build the page's own equivalent and say which API you used and why.
- **The text screen is a normal page: left-aligned, wrapping at the right edge, inside even padding, with a caret that moves with the text.** The vertical anchor is his call and has moved once — it now sits on the **bottom**, newest line on the bottom padding — so keep it one named dial. He rejected a caret pinned to a fixed point.
- Take the look from the concept image, not from taste; ask if there is none. The concept is also the ruler for **spacing and size**: read cap height and baseline spacing as fractions of the frame and match those numbers.
- He tunes the look over several passes, one attribute at a time. Keep it in named CSS dials — text size, `line-height`, `letter-spacing`/`word-spacing`, the outline's `padding`, the screen's `padding` — and move only the dial the request names, saying which.
- Back every claim with real output: quote the command and the tree it ran on.

## Pitfalls

- **If a build step arrives, this skill stops applying.** A bundler replaces `scripts/serve.ts` and the hand-written precache list with the framework's dev server, its two-pass type check and a generated shell list — and any document claiming "nothing builds between the committed files and the published ones" is now false and must be fixed in the same change.
- **A toolchain that serves the build may cache the directory.** `vite preview` reads `build/` once: rebuild underneath it and new hashed files 404, a blank page with `Failed to fetch dynamically imported module`. Restart it after every build. It refuses a foreign `Host` header with 403, so a tunnel needs your own static server.
- **A class rule defeats `[hidden]`** — an author `display: flex` overrides `[hidden] { display: none }`. Add `[hidden] { display: none !important }`, and probe the served CSS or a real element it governs: a fresh `<div hidden>` passes either way, because the UA default already hides it.
- **A full-screen overlay needs a background _and_ a stacking position**, or it shows the layer beneath, or paints _under_ a `position: fixed` sibling. Use `position: fixed; inset: 0; z-index: 1; background: var(--surface)`.
- **A text screen that outgrows the viewport must scroll itself.** `overflow: hidden` still scrolls programmatically: after each character set `screen.scrollTop = screen.scrollHeight`. The top padding scrolls away with the content — that is normal.
- **A caret drawn as an inline element changes where the line wraps.** Cancel its advance with a negative margin (`margin-left: 0.05em; margin-right: calc(-2px - 0.05em)`), and leave a gap from an adjacent word outline — flush against it, the caret reads as part of the outline.
- **"Taller" means both ways, and `vertical-align` decides the one way a bar does not grow.** `text-bottom` keeps its foot on the text's bottom edge, so raising `height` extends it upward only, which he calls one-sided. `-0.5em` with `height: 1.7em` centres it on a chip's middle. Size `height` and `width` in `em`, and keep the negative `margin-right` equal to `width + gap`.
- **Never switch off an animation that is the point of the element.** A `prefers-reduced-motion: reduce` switch is right for decoration and wrong for a caret he asked to pulse: his device reports reduce-motion, so the pulse never ran. Ship it running whatever the device reports, and say so in the design doc.
- **A pulse eased between two endpoints is a triangle, not a wave.** `ease-in-out` holds flat at each extreme and turns a corner there. Sample the law into the keyframes — `opacity: (1 + cos(2*pi*t)) / 2` every 5%, trough exactly 0 — and set `animation-timing-function: linear`.
- **An inline element's padding and border make no space _after_ it**, so whatever follows starts flush against an outlined word. Only a `margin-right` on the outline puts a gap after it.
- **A line break inside an inline chip splits its outline into pieces**: the inline box fragments, the border is drawn around each piece, and `getClientRects()` returns one rect per piece. `overflow-wrap: normal` does **not** stop it — the break falls between the `::before` box and the text — so only `white-space: nowrap` holds the chip together. Assert one client rect per chip.
- **A font carries empty space above and below the glyphs, so equal CSS padding does not look equal**: the reserved ascent and descent dwarf the side bearings, so an evenly padded chip reads top-heavy. The vertical padding is a dial he tunes — `padding: 0.08em 0.32em 0.15em`, top tighter. Move only the side he names, and say the CSS is deliberately uneven. Measure the ink from the pixels, never from the box or a canvas metric.
- **Track keys by `event.code`, never by `event.key`.** Hold Shift and release it before the letter and the same key reports `"A"` going down and `"a"` going up. A down/up map keyed by the character never clears, so when that entry means "a key is down" every later press is judged against it and the keyboard goes silent. Keep the character for what gets written, identify the key by its code, and release by code alone.
- **A border's width snaps to a whole pixel; a background does not.** A 4.9px border draws 4px, so a bar carrying the same value renders 0.9px fatter. Pin a shared thickness as a whole-pixel token (`--stroke: 8px`), not an `em` value — and revisit it when the text size moves, because a length is not a ratio.
- **Insert derived text on the settle signal, never on a pattern match alone.** Matching a listed word the moment it appears cuts a longer word in two: "cats" becomes the listed word, a space, then the leftover letter. Fire the insert from the idle timer that reads the marks, and only when a mark ends at the end of the text. Document the one character the app adds against the append-only rule.
- **In a container that mixes text and elements, do not range over `firstChild`.** A screen rebuilt per write starts with an empty text node when the text opens with a marked span, so `range.selectNodeContents(el.firstChild)` yields no rects and anything read off it throws. Range from the container's start to just before the last element: `range.setStart(el, 0); range.setEndBefore(el.querySelector(".caret"))`.
- **Shading line boxes the browser created.** When the browser wraps there are no per-line elements, so use `mask-image`. Find the caret's line with a `Range` over the text (`getClientRects()` gives one rect per line box, the last is the current line), then set `mask-image: linear-gradient(to bottom, transparent <top - 2.5 * lineHeight>px, black <top>px)` on the screen, recomputed on every write. A mask on a scroll container stays anchored to its box while the text scrolls under it. It fades a line's top as well as the lines above; a stepped look needs hand-measured wrapping — say which you are giving him.
