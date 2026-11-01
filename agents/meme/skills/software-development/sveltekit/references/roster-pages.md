# A roster entry: a project or agent page

`aivara.se` builds a page per roster entry from data, a route table and one dictionary. Adding one is not a folder copy: six places move together, and the tests fail on the ones you miss.

## The change, in order

1. **The row.** `src/lib/data/projects.json` — slug, name, repo, summary, optional `screenshot`. The summary also sits in the dictionary; a test asserts they match.
2. **The route table.** `src/lib/routes.ts` — add the slug to `ProjectKey` and `projectKeys`. `validateProjects` rejects a slug with no entry (`no page for the slug`), so a row cannot link nowhere.
3. **The copy.** `src/lib/i18n/en.ts` — `project.<slug>` with `summary`, `headline`, `description`, four `facts`, three `benefits`, `principle`, six `promises`, `why`. A missing key is a type error, not a blank.
4. **The route.** `src/routes/<slug>/`: `+layout.ts` calling `projectBySlug('<slug>')` — the only place the slug is written — `+layout.svelte` for the shared shell, and `+page.svelte` rendering the shared page with `data.project`.
5. **The roster test.** `projects.test.ts` hardcodes `toHaveLength(n)` and the slug array; widen both first.
6. **The spec.** `PRODUCT.md`'s constraint sentence names every project path; `DESIGN.md` owns how a part is framed — a shot earns its line there the day it is added. Edit both in the same pull request.

## The copy

- Facts come from the product's `PRODUCT.md`. The page argues worth, not construction: no mechanisms or internals.
- Playful and true: a joke that changes a fact is a defect.
- A number comes from the product document, not `du` on a build directory.

## One page, not two copies

Only the copy differs, so the body is one component (`ProjectPage.svelte`) and each route passes `project`. Prove the older route untouched by diffing its built HTML: only hashed asset names and scoped class ids may move.

A part only some projects have is a prop with a default, not a branch on the slug: `ProjectPage` takes `downloads = []` and prints the block only when it has rows. Content from outside the repo: `remote-data.md`.

## The picture

- A screenshot is data on the row, never markup: `screenshot: { src: '/projects/<slug>.png', alt, width, height }`, the file under `static/`, the sizes its own pixels. No screenshot, no figure.
- Validate at the boundary — src starts at `/`, non-empty alt, positive integers — and test `existsSync(join(root, 'static', shot.src))`, so a moved file fails the gate.
- Set `width`/`height` plus `loading="lazy"` and `decoding="async"`: they reserve the box, and `width: 100%; height: auto` scales it to the column. Without them everything below jumps.
- Alt says what the shot shows; write it from the image, not the product document.
- Frame it in the site's terms — one `--line` hairline, an 8px radius, 40px under the facts strip — and put the same numbers in `DESIGN.md`.
- The bytes: an image sent in chat is named by a path only the vision tool opens. The readable copy is `$HOME/.hermes/cache/images/<img_…>.png`; copy it into `static/`, and into `docs/` where a README links it.

## Done

`bun run check`, `format:check`, `bun test`, `bun run build`, then serve `build/` and read the DOM: the row, the headline, four facts, six refusals, the canonical tag, no sideways scroll at 360px, and the home page's derived count moving with the row list. With a shot: one request at the path the data names, natural size equal to the declared one, its gap to the strip above, and no figure on a project without one.
