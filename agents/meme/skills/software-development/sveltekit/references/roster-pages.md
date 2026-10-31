# A roster entry: a project or agent page

`aivara.se` builds a page per roster entry from data, a route table and one dictionary. Adding one is not a folder copy: six places move together, and the tests fail on the ones you miss.

## The change, in order

1. **The row.** `src/lib/data/projects.json` — slug, name, repo, summary, and the optional `screenshot` (see *The picture*). The summary lives once here and once in the dictionary; a test asserts they are the same string.
2. **The route table.** `src/lib/routes.ts` — add the slug to `ProjectKey` and to `projectKeys`. `validateProjects` rejects a slug with no table entry (`no page for the slug`), which is the point: a row cannot link nowhere.
3. **The copy.** `src/lib/i18n/en.ts` — `project.<slug>` with `summary`, `headline`, `description`, four `facts`, three `benefits`, `principle`, six `promises`, `why`. Mirror the shipped page's parts; a missing key is a type error rather than a blank.
4. **The route.** `src/routes/<slug>/`: `+layout.ts` calling `projectBySlug('<slug>')` — the only place the slug is written — `+layout.svelte` wrapping the shared shell, and `+page.svelte` rendering the shared page with `data.project`.
5. **The roster test.** `projects.test.ts` hardcodes `toHaveLength(n)` and the slug array; widen both before running the suite.
6. **The spec.** `PRODUCT.md`'s constraint sentence names every project path, and `DESIGN.md` owns how a part of the page is framed — a shot earns its line there the day it is added. A page or a part the documents do not describe makes them untrue.

## The copy

- Take the facts from the product's own `PRODUCT.md`. The page argues worth to the reader, not construction: no mechanisms, record formats or internals.
- Playful and true: a joke that changes a fact is a defect, not a voice.
- A number comes from the product document, not from `du` on a build directory: the two disagree at the margin and the document is the claim.

## One page, not two copies

Only the copy differs between projects, so the body is one component (`ProjectPage.svelte`) and each route passes `project`. Prove the older route is untouched by diffing its built HTML before and after the extraction: hashed asset names and scoped class ids are the only lines allowed to move.

## The picture

- A screenshot is data on the row, never markup in the page component: `screenshot: { src: '/projects/<slug>.png', alt, width, height }`, the file under `static/`, the sizes the file's own pixels. A project without one renders no figure, so the component stays shared.
- Validate it at the boundary — an src that starts at `/`, a non-empty alt, positive integers — and add one test that `existsSync(join(root, 'static', shot.src))`, so a moved file fails the gate instead of shipping a broken image.
- Set `width`/`height` on the `<img>` (plus `loading="lazy"` and `decoding="async"`): the attributes reserve the box, and CSS `width: 100%; height: auto` scales the shot to the column. Without them every part below jumps as the picture lands.
- Alt says what the shot actually shows. An alt that promises a log the picture does not have is a false claim on a public page, so write it from the image, not from the product document.
- Frame it in the site's own terms — one `--line` hairline and an 8px radius, 40px under the facts strip — rather than a new surface, and put the same numbers in `DESIGN.md`.
- The bytes: an image sent in chat is named by a path only the vision tool can open. The copy the sandbox can read is in `$HOME/.hermes/cache/images/<img_…>.png` — copy it into `static/` for the site and into the repo's `docs/` where a README links it.

## Done

`bun run check`, `format:check`, `bun test`, `bun run build`, then serve `build/` and read the DOM: the row on the front page, the headline, four facts, six refusals, the canonical tag, no sideways scroll at 360px — and the home page's derived project count moving with the row list. Where the page carries a shot: one request for it at the path the data names, a natural size equal to the declared one, its gap to the strip above, and no figure on a project without one.
