# Leak scan on a change

Scope `<repo>@<head sha>` against `<base sha>`. Output: one verdict and what held.

## Pin the change without dirtying the clone

```
git -C ~/github/<owner>/<repo> fetch origin '+refs/pull/<N>/head:refs/remotes/pr/<N>'
git rev-parse refs/remotes/pr/<N> origin/main
git diff origin/main...refs/remotes/pr/<N> > ~/scratch/<agent>/pr/change.diff
rm -rf tree && mkdir tree && git archive refs/remotes/pr/<N> | tar -x -C tree
```

## Two scanners, both required

**gitleaks, tree and history.** Static binary under `/root` (no sudo, survives a rebuild):

```
curl -sSfL -o /tmp/gl.tgz https://github.com/gitleaks/gitleaks/releases/download/v8.28.0/gitleaks_8.28.0_linux_x64.tar.gz
tar -xzf /tmp/gl.tgz -C ~/bin gitleaks
~/bin/gitleaks dir tree --no-banner --redact=0 --report-format json --report-path gl.json
~/bin/gitleaks git --no-banner --redact=0 --report-format json --report-path gl-git.json \
  --log-opts="origin/main..refs/remotes/pr/<N>" .
```

`dir` sees the final tree only; the `git` run catches a secret added and removed inside the branch. Keep `--redact=0` so the report quotes the value, and keep the report in scratch — the chat names the class, never the string.

**A pattern pass for shapes the generic rules skip.** Gmail app passwords (four groups of four lowercase letters, gated on `app password|smtp|imap` in the same line), Telegram bot tokens (`\d{8,10}:[A-Za-z0-9_-]{35}`), JWTs (`eyJ….eyJ….…`), credentials in a URL (`scheme://user:pass@host`), private-key blocks, long hex/base64 with Shannon entropy above ~3.2.

Filter: `your-`, `example`, `<...>`, `${...}`, `0{8,}`. Word boundaries bite — `sk-` matches inside `task-concurrency`, `password` matches prose — so a match is a candidate until you read the line.

## What no scanner tells you

- **Repository visibility.** `gh repo view <owner>/<repo> --json visibility` for every `owner/repo` string in the tree. A private repo's name in a public tree discloses its existence.
- **Internal identifiers.** Resolve, do not guess: `gh api graphql -f query='{ node(id:"PVT_…"){ ... on ProjectV2 { title number public } } }'`. `public: true` leaks nothing.
- **Host paths and users.** `grep -rhoE '/home/[A-Za-z0-9._-]+|/(etc|var|opt|srv|mnt)/[A-Za-z0-9._/-]+'`; a generic `/root/.local` is noise, `/root/.config/gh` holds the token.
- **Contact data.** Emails, phone numbers, customer or client names.
- **Files named like secrets.** `find . -name '*.env*' -o -name '*.pem' -o -name '*.key' -o -name '*credential*'`.

## Pitfalls

- **`git archive` output is not the clone.** Hashing an exported tree is fine; a manifest listing names relative to a subdirectory needs the join checked once by hand before you believe a batch result.
- **A clean scan is a claim about a tree, not the project.** Name the sha and the range, and that it was tree plus commits.
- **A residual is not a defect.** Host paths and personal names may be exempted by the change's own contract (`AGENTS.md`, the PR body): report the count and the sharpest example in one line as the operator's call.
- **A pattern hit is not a finding.** Placeholders, prose collisions and manifest hashes are the three common false positives.
