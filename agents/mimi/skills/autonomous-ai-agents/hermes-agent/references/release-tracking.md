# Tracking what changed in Hermes

Use when asked what is new in Hermes, whether a capability exists in the version we run, or which new feature is worth adopting.

## Get the version to quote

`curl -s https://api.github.com/repos/NousResearch/hermes-agent/releases/latest` returns `tag_name` and `published_at`. Quote that pair. A local shell may run a different install, so the API is the version of record.

## Read the release the way it is written

- `releases?per_page=8` returns full bodies. Each opens with a summary, then highlights, then — in a patch release — a paragraph beginning "Also in the window, undocumented on purpose". That paragraph is the only list of features deliberately left out of the highlights. Read it.
- A body saying curated notes ship with the next minor release means the current highlights are incomplete; the window list is all there is until then.
- Bodies run 40–50k characters and end in a contributor roll. Search for a phrase rather than reading top to bottom.
- `json.loads` fails on control characters in these bodies: use `json.loads(raw, strict=False)`.

## Verify the feature, and its age

- Every shipped feature has one line in https://hermes-agent.nousresearch.com/docs/llms.txt with a link. Fetch it; do not answer from memory.
- Rendered docs pages lose structure in extraction. Fetch the markdown source instead: `https://raw.githubusercontent.com/NousResearch/hermes-agent/main/website/docs/<path>.md` — the llms.txt URL minus the host and `/docs/`, plus `.md`.
- A page in the current docs is not evidence of a new feature. Get the file's history: `commits?path=website/docs/<path>.md&per_page=100`. The last element's date is when the page was introduced; the first is the latest edit. Call it new only from the introduction date.
- Plugin facts come from the repo, not the docs page: `contents/plugin-catalog` lists entries; each `<name>.yaml` carries `tier` (`official`, `verified`, `community`), the reviewed `sha` and the `repo`; `commits?path=plugin-catalog/<name>.yaml` gives the date added, and the commit subject often names the minimum Hermes version the manifest now requires.
- Check a required version against the release we run before recommending an install: a manifest can require a newer release, and the install refuses rather than degrading.

## Decide whether it earns a place

- Name the repo, the file it would change, and the number it would move. A capability that only changes how the agent feels does not earn a card.
- Rank by dependency: the feature that produces the measurement comes before the one that acts on it.
- State the caveat that decides safety, not only the benefit: credentials shared across profiles, concurrency limits, or an ADR the feature would violate.

## Answer shape

One recommendation, a scoped spike with a checkable *Done means*, and the ask to open the card. The other findings go in a note with sources, not in the message.
