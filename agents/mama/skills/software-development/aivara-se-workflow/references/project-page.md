# A project page on aivara.se

A project is top-level at `/<slug>/`, and every project shares one `ProjectPage` component. Adding one is three files and three lists. Read an existing project's page at `origin/main` before copying its shape: the site consolidates repeated pages into one component, so an older copy is the wrong shape.

## The three lists

- `src/lib/routes.ts`: the `ProjectKey` union and the `projectKeys` array. `projectHref` builds `/<slug>/`.
- `src/lib/data/projects.json`: `slug`, `name`, `repo`, `summary`, and optional `site` and `screenshot` (`src` under `static/`, `alt`, the file's own `width` and `height`).
- `src/lib/data/projects.test.ts`: the curated list's length and slug order are literals. `src/lib/data/agents.test.ts` compares the directories in `src/routes/` against `projectKeys`. A slug missing from one list fails the gate.

`summary` is the front-page row and must equal `d.project.<slug>.summary`; a test compares them.

## The three files

`src/routes/<slug>/+layout.ts` returns `{ project: projectBySlug("<slug>") }` — async, adding `latestDownloads` only where the project ships archives. `+layout.svelte` wraps `ProjectShell`. `+page.svelte` renders `<ProjectPage project={data.project} />`.

## The copy

`src/lib/i18n/en.ts` under `project.<slug>` carries `summary`, `headline`, `description`, four `facts`, three `benefits.items`, `principle`, six `promises.items` (the design's refusals ledger), and `why`. It argues worth in the reader's terms; the product document bans mechanisms, limits and record formats here. Every label the shared component prints lives in the dictionary (`projectPage.play`, `projectPage.code`), never in the component.

## A web app or a screenshot

- **A web app gets `site`, not a download.** The page prints it as `Play it` beside `Read the code`. Take the address from `gh api repos/<owner>/<repo>/pages --jq .cname`: a repository's `homepageUrl` can still name the `github.io` host while a custom domain serves the app.
- **A screenshot is optional and is a claim.** Take it from the build or the live app, record its true `width` and `height`, and check the image with vision before shipping. Leave the field out when the sandbox substitutes a font or an emoji the device will not draw: the shot would show a screen the app never draws.

A new page moves the path list in `PRODUCT.md` and the action row in `DESIGN.md`. Verify with the gate, the built-page grep and the two-width render in `references/website-page.md`.
