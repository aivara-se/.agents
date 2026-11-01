---
name: library-fitness-check
description: "Use when judging if a library exists or is maintained."
version: 1.0.0
author: MiMi (thani-sh-mimi)
license: MIT
metadata:
  hermes:
    tags: [research, dependencies, frameworks, evaluation]
    category: research
    related_skills:
      [grounded-citations, spike, desktop-app-stack-choice, writing]
---

# Is this library real, current, and the right shape

Answer from the registry and the vendor's own documentation, then name the risk. A project's marketing site and a blog post both lag the package; the registry does not.

## When to Use

- "Is there an X alternative to Y?"
- "Does Z support the current major of our framework?"
- "Is this package still maintained?"
- Before recommending a dependency the operator will live with for a year.

## Procedure

1. **Write the constraint as a testable sentence before searching.** "Renders native widgets, no WebView" is a criterion; "works on mobile" is not. Marketing copy satisfies the vague version, so fix the strict one first.

2. **Read the registry: latest version, publish dates, peer dependencies.**

   ```sh
   pkg='@scope/name'; enc=$(printf %s "$pkg" | sed 's|/|%2F|')
   curl -s -o /tmp/pkg.json "https://registry.npmjs.org/$enc"
   python3 - <<'PY'
   import json
   d = json.load(open('/tmp/pkg.json'), strict=False)
   v = d['dist-tags']['latest']
   print(v, '| published', d['time'][v], '| created', d['time'].get('created'))
   print('peer:', d['versions'][v].get('peerDependencies'))
   print('repo:', (d.get('repository') or {}).get('url'))
   print('versions:', len(d['versions']))
   PY
   ```

   Then read adoption: `curl -s https://api.npmjs.org/downloads/point/last-month/<pkg>` returns monthly downloads. Compare it with the direct alternative, never with the ecosystem leader.

3. **Treat `peerDependencies` as the compatibility contract.** `{svelte: '4.2.20'}` means the current major is unsupported, whatever the README claims; a caret or `>=` range on the new major means it is the target. Check every exact pin, not only the framework pin: an exact pin on the host runtime (`@nativescript/core: 8.9.9`) goes stale the same way, so probe that host's current release too. A version published months ago under an old pin is dormant, not maintained.

4. **Read the official docs' own statement for that area.** A framework FAQ that names its supported native path is an endorsement; a community POC mentioned in a blog post is a proposal. Quote the sentence.

5. **Judge maturity from dates and authorship, not from the version number.** First publish, latest publish, versions published, and who commits. Months old with one maintainer and a `beta` tag is prototype risk — say so in one clause.

6. **Report the constraint, not just the name.** What it renders (native widgets vs WebView), which major it pins, the release date, and the failure mode if the project stalls.

## Pitfalls

- **Parsing large JSON from `terminal` stdout.** Output gets truncated or carries control characters and `json.loads` raises `Extra data`; `curl -o file` then parse the file, with `strict=False` for descriptions.
- **A version number without a date.** "v3.3.0" reads mature; "first published two months ago, single maintainer" is the actual finding.
- **An unmerged PR is not support.** Check the PR or issue state before writing "coming soon" — an API that has been open for months changes the answer.
- **Confusing WebView with native.** Capacitor and Tauri run your Svelte app in a WebView; NativeScript and React Native drive platform widgets. If the user ruled out WebViews, those options do not count, however good they are.
- **Repeating vendor adjectives.** "Blazing", "production-ready", "battle-tested" are claims; publish date, peer range and committer count are facts.
- **A healthy-looking site on a dead package.** Check the last commit and the last registry publish together; either alone misleads.
- **Conflicting self-descriptions.** A landing page can say "stable" while the README says "beta" and the status page lists missing features. Prefer the registry dates, the contributor count and the limitations page; state the weakest one as the risk.

## Answer Shape

- Direct yes/no in the first line, then two or three named options.
- Each option carries: pinned major, publish date, maturity risk.
- Chat answers stay under 150 words with no preamble — see `writing`.

## Comparison Requests

- Probe every option with the same steps, then give each the same axes: renderer, supported framework major, module ecosystem, styling, tooling, first release, downloads, risk.
- Put the comparison in a markdown document with one table, attach it, and keep the chat to the verdict plus the three strongest numbers.
- Add a "where the evidence stops" section. A vendor benchmark page that says "pending" means no speed number exists; report that, do not repeat an adjective.

## References

- `references/registry-probes.md` — the same probe for PyPI, crates.io and GitHub state (last commit, contributors, PR/issue open), plus a table that turns the date and peer range into a maturity verdict.
