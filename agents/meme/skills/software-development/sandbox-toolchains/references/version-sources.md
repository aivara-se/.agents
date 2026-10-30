# Where the latest version comes from

One authoritative endpoint per tool. Query it, take the first entry, and print
what you took — a version number copied out of a search snippet is the most
common wrong answer in this class of task.

| Tool | Endpoint | First entry is |
|---|---|---|
| Node | `https://nodejs.org/dist/index.json` | newest of any line (`v26.x`); filter `select(.lts != false)` for LTS only |
| Go | `https://go.dev/dl/?mode=json` | newest stable (`go1.x.y`), repeats once per arch — dedupe |
| Bun | `https://api.github.com/repos/oven-sh/bun/releases/latest` | `tag_name`, strip the `bun-v` prefix |
| gh | `https://api.github.com/repos/cli/cli/releases/latest` | `tag_name`, strip the `v` prefix |

## Archive names

- Node: `node-v<ver>-linux-x64.tar.xz` from the same index URL, extract to
  `/usr/local` with `--strip-components=1` or copy the four dirs by hand.
- Go: `go<ver>.linux-amd64.tar.gz` from `https://go.dev/dl/`, extracts to a
  `go/` directory — replace `/usr/local/go` wholesale rather than merging, so
  a removed stdlib file does not survive the upgrade.
- Bun: `bun-linux-x64.zip` from the release by tag; the zip holds a
  `bun-linux-x64/` directory containing `bun`.
- gh: `gh_<ver>_linux_amd64.tar.gz`; the binary sits at
  `gh_<ver>_linux_amd64/bin/gh`.

## Notes

- `uname -m` decides the suffix: `x86_64` → `x64`/`amd64`, `aarch64` →
  `arm64`/`arm64`.
- GitHub's `api.github.com` without a token is rate limited per IP; one
  request per release is fine, a loop over many repos is not.
