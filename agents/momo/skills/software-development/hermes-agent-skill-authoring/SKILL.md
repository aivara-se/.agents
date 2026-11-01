---
name: hermes-agent-skill-authoring
description: "Author in-repo SKILL.md files: frontmatter and structure."
version: 2.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [skills, authoring, hermes-agent, conventions, skill-md]
    related_skills: [requesting-code-review]
---

# Authoring Hermes-Agent Skills (in-repo)

## Where a skill lives

1. **User-local:** `~/.hermes/skills/<maybe-category>/<name>/SKILL.md` — personal, not shared; made with `skill_manage(action='create')`.
2. **In-repo (this skill):** `skills/<category>/<name>/SKILL.md` or `optional-skills/<category>/<name>/SKILL.md` in the hermes-agent repo — committed and shipped with the package. Use `write_file` + `git add`; `skill_manage(action='create')` does NOT target this tree.

In-repo skills must meet the hardline standards in AGENTS.md ("Skill authoring standards (HARDLINE)" — the source of truth; this skill is the walkthrough). Reviewers reject PRs that violate them.

## When to Use

- A skill must ship "in this branch / repo / commit".
- You are committing a reusable workflow that belongs with hermes-agent.
- You are editing an existing skill under `skills/` or `optional-skills/`: `patch` for small edits, `write_file` for rewrites. `skill_manage` patches in-repo skills but cannot create them.
- Not for personal skills in `~/.hermes/skills/` — use `skill_manage`.

## Decide the tier first

- **Bundled (`skills/<category>/`)** — daily-driver behaviour, broadly useful, low footprint. Hard bar: "a user will load this in 5+ sessions per month".
- **Optional (`optional-skills/<category>/`)** — niche, vertical, one app, heavy. Installed with `hermes skills install official/<category>/<skill>`.

**When in doubt, optional.** Promoting later is easy; demoting is churn. Pick the category by what the tool IS (an AI-agent CLI goes in `autonomous-ai-agents/` even if it feels productivity). Check existing categories with `search_files(pattern='*', target='files', path='skills')`; do not invent top-level ones casually.

**No router / index / hub skills.** A routing table at siblings adds a hop and duplicates their own `When to Use` triggers. If the skill would be empty without "load skill X instead", do not write it.

## Required frontmatter

Validator: `tools/skill_manager_tool.py::_validate_frontmatter`. It requires `---` at byte 0 (no blank line, no BOM), a closing `\n---\n`, a YAML mapping, `name`, `description`, and a non-empty body.

Repo-standard shape (all fields expected, even where the validator is silent):

```yaml
---
name: my-skill-name # lowercase, hyphens, ≤64 chars (MAX_NAME_LENGTH)
description: Concise capability statement, under sixty chars.
version: 0.1.0 # semver; new skills start at 0.1.0
author: Real Name (github-handle), Hermes Agent
license: MIT
platforms: [linux, macos, windows] # audit, don't guess — see Platform Gating
metadata:
  hermes:
    tags: [Short, Descriptive, Tags]
    related_skills: [other-in-repo-skill]
---
```

### `description` rules (HARDLINE — the validator's 1024 is NOT the standard)

- **≤ 60 characters**, one sentence, ends with a period.
- State the capability, not the implementation; do not repeat the skill name.
- No marketing words ("powerful", "comprehensive", "seamless", "advanced").
- The skill index truncates at 57 chars + "..." — the trigger must be self-contained in that window.
- A `:` in the value needs double quotes, or YAML parses it as a mapping and the docs generator crashes. Quotes do not count toward the 60.

Good: `Track named companies for material news with cited digests.`

### `author` rules

- Credit the **human first**, then "Hermes Agent": `Ben Barclay (benbarclay), Hermes Agent`.
- Never `author: Hermes Agent` alone on a contributed skill — even when an agent drafted the text.
- Maintainer-authored skills: `Teknium (teknium1), Hermes Agent`.

### `related_skills` rules

- Every entry must resolve to an existing **in-repo** skill in the same tree state as your PR — not planned, not in a sibling PR, not user-local.
- Verify each: `search_files(pattern='<name>', target='files', path='skills')` (and `optional-skills/`).

## Platform gating: audit, don't trust

`platforms:` gates loading by host OS. Set it from what the prose and scripts actually invoke:

| Skill uses only… | `platforms:` |
| --- | --- |
| Hermes tools + stdlib Python + cross-platform CLIs | `[linux, macos, windows]` |
| bash pipelines, `grep`/`awk`/`sed` chains, heredocs | `[linux, macos]` |
| `osascript`, `defaults`, `pmset` | `[macos]` |
| `apt`/`systemctl`/`/proc` | `[linux]` |

<!-- no-tmp: ok — names the anti-pattern skill authors must avoid -->

POSIX-only signals to search for in `scripts/`: `fcntl`, `termios`, `pty`, `os.fork`, `os.killpg`, `signal.SIGKILL`, `os.kill(pid, 0)` liveness checks, hardcoded `/tmp` `/proc` `/etc`. Fix cross-platform first (`tempfile.gettempdir()`, `pathlib.Path`, `psutil.pid_exists`); gate narrower only when the dependency is genuinely platform-bound, and say why in the Pitfalls section.

## Size limits

- Full SKILL.md is capped at 100,000 chars (`MAX_SKILL_CONTENT_CHARS`); target ~100 lines for a simple skill, ~200 for a complex one.
- Bulky or branch-specific material goes in `references/*.md`, `templates/` or `scripts/`, pointed to from SKILL.md, not inlined.
- Do not expect the model to inline-write parsers every call — ship a helper script and reference it by path.

## Body structure

```
# <Skill> Skill
2-3 sentence intro: what it does, what it doesn't do, dependency stance.

## When to Use          — bulleted triggers (+ "Don't use for:" counter-triggers)
## Prerequisites        — exact env vars, installs, API key sourcing
## How to Run           — canonical invocation through the `terminal` tool
## Quick Reference      — flat command list, no narration
## Procedure            — numbered steps, each with a checkable completion criterion
## Pitfalls             — known limits, things that look broken but aren't
## Verification         — how to prove the skill worked
```

Not every section applies, but When to Use + actionable body + Pitfalls + Verification are the minimum. Cut marketing intros, "Setup Check" no-ops, and re-explanations of env vars already in Prerequisites.

### Name Hermes tools, not raw shell

Name the proper tool in backticks: `terminal`, `read_file`, `write_file`, `patch`, `search_files`, `web_search`, `web_extract`, `browser_navigate`, `vision_analyze`, `delegate_task`, `cronjob`. Do not name utilities the agent already wraps (`grep` → `search_files`, `cat` → `read_file`, `sed`/`awk` → `patch`, `find`/`ls` → `search_files target='files'`). A CLI-wrapper skill frames calls as `terminal(command="{tool} ...", timeout=...)`; bare shell prose ("run `foo --version`") blocks review. Name any MCP server in Prerequisites.

### Never use machine-local paths

Write repo-relative paths (`skills/...`, `tools/skill_manager_tool.py`). A `/home/<you>/...` path in a committed skill breaks for every other user and is an instant review flag.

## Writing quality

A skill exists to make the agent's process more predictable.

1. **Optimize for process predictability.** A line that does not change behaviour is cut.
2. **Choose the right context load.** The description is paid every turn; details go in the body or a reference.
3. **End steps with completion criteria**, checkable and exhaustive: "every modified file accounted for" beats "summarize changes".
4. **Co-locate a rule with the concept it governs.**
5. **Use strong leading words** ("tight loop", "root cause", "regression test").
6. **Prune duplication and no-ops.** "Be careful" changes nothing; replace it with a checkable criterion or delete it.
7. **Write the operator's rule into the governing skill the moment they state it.** A rule given in chat is not durable: the next rewrite drops what nobody recorded. When told a rule was already given, `search_files` the skill for the phrase; if absent, land it in that session as a short always-on line.
8. **Write the rule as a check, not a virtue.** "Keep the change small" changes nothing; "name the item line each finding defends, and delete a finding that names none" binds, because it runs per finding and the result is visible. A rule needs a step, an output, and a place the reader can see it.

## Tests and docs (required for repo skills)

1. **Tests** at `tests/skills/test_<skill>_skill.py` — stdlib + pytest + `unittest.mock`, no live network. Run `scripts/run_tests.sh tests/skills/test_<skill>_skill.py -q`. Passing the generic `tests/tools/test_skill_manager_tool.py` proves nothing about YOUR skill.
2. **Docs regen:** run `python website/scripts/generate-skill-docs.py`, then apply scope discipline — it rewrites EVERY auto-gen page. `git checkout --` everything that is not yours. The final diff shows your SKILL.md, one per-skill docs page, a one-line catalog row, and a one-line `website/sidebars.ts` insertion (`search_files(pattern='<your-slug>', path='website/sidebars.ts')` — exactly one hit, or the page is an orphan).
3. **`.env.example`** only for new env vars: one delimited commented block.

## Workflow

1. **Survey peers** in the target category with `search_files(target='files')`; read 2-3 peer SKILL.md files for tone and structure. Prefer extending an existing skill to creating a narrow sibling.
2. **Decide tier and category.** In doubt, optional — and ask before pushing.
3. **Draft** with `write_file`.
4. **Validate locally**:

   ```python
   import re, pathlib
   from ruamel.yaml import YAML
   content = pathlib.Path("skills/<category>/<name>/SKILL.md").read_text()
   assert content.startswith("---")
   m = re.search(r'\n---\s*\n', content[3:])
   fm = YAML(typ="safe").load(content[3:m.start()+3])
   assert "name" in fm and "description" in fm
   assert len(fm["description"]) <= 60, f"description {len(fm['description'])} chars — hardline is 60"
   assert fm["description"].endswith(".")
   assert "platforms" in fm
   assert len(content) <= 100_000
   ```

   Also verify every `related_skills` entry exists in-repo.

5. **Add tests, regen docs.**
6. **Commit on the active branch and open a PR.**
7. **Expect the current session not to see the skill.** The loader is cached, so `skill_view` / `skills_list` show the old state until a new session. That is not a bug.

## Editing an existing in-repo skill

- **Small fix:** `skill_manage(action='patch', ...)` or `patch`.
- **Major rewrite:** `write_file` the whole SKILL.md.
- **Supporting files:** `write_file` into `references/`, `templates/` or `scripts/`.
- **Always commit** — in-repo skills are source, not runtime state. Re-run the docs generator when frontmatter changed.

## Pitfalls

1. **`skill_manage(action='create')` for an in-repo skill.** It writes to `~/.hermes/skills/`, not the repo. Use `write_file`.
2. **Trusting the validator as the standard.** It allows 1024-char descriptions; review rejects anything over 60. It checks no `platforms:`, author format, tests or docs — review does.
3. **`author: Hermes Agent` on a contributed skill.** Credit the human first.
4. **Leading whitespace before `---`.** A blank line or BOM fails validation.
5. **A description too generic, or a trigger buried past char 57.**
6. **`related_skills` pointing at skills not in-repo.**
7. **Duplicating a peer.** Survey first; extend rather than sibling.
8. **Skipping the docs generator, or pushing its drift.** No regen leaves an orphan page; blind regen balloons the diff with other skills' changes.
9. **Expecting the session to see a skill you just wrote.** `skill_view` serves the copy it read at session start: a new skill is invisible, an edited one shows its pre-edit text. Verify on disk with `read_file` on the `skill_dir` path, never by re-calling `skill_view`.
10. **Sediment.** When you add a rule, remove the wording it replaces.

## Verification checklist

- [ ] Tier decided (bundled bar: 5+ sessions/month; else `optional-skills/`)
- [ ] File at `skills/<category>/<name>/SKILL.md` or `optional-skills/<category>/<name>/SKILL.md`
- [ ] Frontmatter starts at byte 0 with `---`, closes with `\n---\n`
- [ ] `name`, `description`, `version`, `author`, `license`, `platforms`, `metadata.hermes.{tags, related_skills}` present
- [ ] Description ≤ 60 chars, one sentence, ends with a period, no marketing words
- [ ] `author` credits the human first
- [ ] `platforms:` audited against the prose and scripts, not copied from a sibling
- [ ] Every `related_skills` entry resolves in-repo
- [ ] Each ordered step has a checkable completion criterion
- [ ] No machine-local paths
- [ ] Tests pass under `scripts/run_tests.sh`
- [ ] Docs regenerated with scope discipline; exactly one sidebar entry
- [ ] Committed on the intended branch; PR opened
