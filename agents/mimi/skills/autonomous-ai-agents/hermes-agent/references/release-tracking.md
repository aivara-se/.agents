# Tracking what changed in Hermes

Use when asked what is new in Hermes, whether a capability exists in the version we run, or which new feature is worth adopting.

## Quote the version

`curl -s https://api.github.com/repos/NousResearch/hermes-agent/releases/latest` gives `tag_name` and `published_at`; quote that pair. A local shell may run a different install, so the API is the version of record.

## Read releases as written

- `releases?per_page=8` returns full bodies: summary, highlights, then — in a patch release — "Also in the window, undocumented on purpose", the only list of features kept out of the highlights. Read it.
- Bodies are long and end in a contributor roll: search a phrase, do not read top to bottom. `json.loads` chokes on control characters — use `json.loads(raw, strict=False)`.

## Verify the feature, and its age

- Every shipped feature has one line in https://hermes-agent.nousresearch.com/docs/llms.txt with a link. Fetch it; do not answer from memory.
- Extraction loses structure: fetch the source, `https://raw.githubusercontent.com/NousResearch/hermes-agent/main/website/docs/<path>.md` — the llms.txt URL minus the host and `/docs/`, plus `.md`.
- A page in the current docs is not proof of a new feature: `commits?path=website/docs/<path>.md&per_page=100` — the last element dates its introduction, the first the latest edit. Call it new from the introduction date only.
- Plugin facts come from the repo, not the docs: `contents/plugin-catalog`, each `<name>.yaml` with `tier` (`official`, `verified`, `community`), reviewed `sha` and `repo`; `commits?path=plugin-catalog/<name>.yaml` dates it, and the subject often names the minimum Hermes version.
- A manifest can demand a newer release, and the install refuses rather than degrading: check it against the version we run first.

## Decide whether it earns a place

- Name the repo, the file it would change and the number it would move; a capability that only changes how the agent feels earns no card.
- Rank by dependency: the feature that produces the measurement precedes the one that acts on it.
- State the caveat that decides safety: credentials shared across profiles, concurrency limits, an ADR it would violate.

## Answer shape

One recommendation, a scoped spike with a checkable _Done means_, and the ask to open the card. Other findings go in a note with sources.
