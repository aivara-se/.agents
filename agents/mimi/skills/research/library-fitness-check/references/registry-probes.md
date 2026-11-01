# Registry probes

One probe per ecosystem, so the version, date and compatibility range come from the package index rather than from a README.

## npm

```sh
pkg='@scope/name'; enc=$(printf %s "$pkg" | sed 's|/|%2F|')
curl -s -o /tmp/pkg.json "https://registry.npmjs.org/$enc"
python3 - <<'PY'
import json
d = json.load(open('/tmp/pkg.json'), strict=False)
v = d['dist-tags']['latest']
print(v, d['time'][v], d['time'].get('created'), len(d['versions']))
print(d['versions'][v].get('peerDependencies'))
print(d['versions'][v].get('engines'))
PY
```

- `peerDependencies` — the host frameworks and the majors the package accepts.
- `engines` — the Node range the package will run on.
- `d['time']` — creation and per-version publish dates; compare the two for age.
- `len(d['versions'])` — five versions is a young project; a hundred is a mature one.

## npm downloads

```sh
curl -s "https://api.npmjs.org/downloads/point/last-month/@scope%2Fname"
```

- The number is a range, not a census: CI, mirrors and monorepos inflate it.
- Read it against the direct alternative in the same month, not against the framework leader. An order of magnitude below the alternative is prototype adoption, whatever the demo shows.

## PyPI

```sh
curl -s -o /tmp/pkg.json https://pypi.org/pypi/<name>/json
python3 - <<'PY'
import json
d = json.load(open('/tmp/pkg.json'))
i = d['info']
print(i['version'], i.get('requires_python'))
print(i.get('requires_dist'))
print(sorted(d['releases'])[-1], d['releases'][sorted(d['releases'])[-1]][0]['upload_time'])
PY
```

`requires_python` is the hard compatibility line; `requires_dist` carries version pins.

## crates.io

```sh
curl -s -H 'User-Agent: fitness-check' https://crates.io/api/v1/crates/<name> \
  | python3 -c "import sys,json; d=json.load(sys.stdin); c=d['crate']; print(c['max_version'], c['updated_at'], c['downloads'], c['recent_downloads'])"
```

Rust has no peer dependencies; read the `features` and the MSRV field in the docs instead, and treat `updated_at` as the liveness signal.

## GitHub: last commit, contributors, PR state

```sh
gh api repos/<owner>/<repo> --jq '{pushed_at, archived, stargazers_count, open_issues_count}'
gh api 'repos/<owner>/<repo>/commits?per_page=1' --jq '.[0].commit.committer.date'
gh api 'repos/<owner>/<repo>/contributors?per_page=100' --jq 'length'
gh pr view <n> --repo <owner>/<repo> --json state,mergedAt,updatedAt
gh issue view <n> --repo <owner>/<repo> --json state,updatedAt
```

- `archived: true` ends the question — the project is frozen.
- One contributor with a young package is a bus-factor finding, not a flaw to hide.
- An issue or PR still `OPEN` with a recent `updatedAt` is work in progress; state that, and do not describe it as shipped.

## Reading the answer

| Signal | Reading |
| --- | --- |
| latest publish < 6 months, caret range on current major | current |
| latest publish 6–18 months, old major pin | dormant, incompatible |
| first publish < 12 months | young; name the beta risk |
| archived repo | dead; use only as history |
| peer dep exact-pinned to an old version | unsupported, regardless of README |
| downloads an order of magnitude below the alternative | prototype adoption; name it |

Report the row you used. One clause of risk beats a paragraph of hedging.
