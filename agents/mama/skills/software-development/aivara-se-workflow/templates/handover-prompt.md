# Handover: implement <the thing> — one pull request

Implement <the thing> as these documents describe, in one pull request, without changing the design.

REPOSITORY <owner>/<repo> — clone to ~/github/<owner>/<repo>, branch from an up-to-date <default branch>.

READ FIRST, IN THIS ORDER

- AGENTS.md — entry file, house rules.
- README.md — build, run, deploy.
- `PRODUCT.md` and `SYSTEMS.md` — behaviour, acceptance, architecture — at the repository root or under `docs/`, as the repository carries them.
- docs/adrs/ — the decisions.
- aivara-se/.agents — coding and testing skills.

THE DOCUMENTS ARE THE SPECIFICATION; THE DESIGN IS FROZEN PRODUCT.md, SYSTEMS.md and the ADRs are authoritative: do not edit, reinterpret, or duplicate them. If two documents disagree, or a step cannot be built as written, STOP and ask. Do not pick a reading, weaken a rule, or invent a mechanism.

BUILD THE WHOLE OF <v1> IN ONE BRANCH AND ONE PR

- <files and packages, one line each: what it is, the document it implements.>

For a slice rather than the whole version, replace the heading with the slice's name and scope, state the contracts it assumes from the documents, and name the later slices out of scope in the body. One slice still lands as one pull request with its own gate.

GAPS — TAKE THESE READINGS

- <each gap, the reading you expect, where to say so. A value only the operator knows is a question, not a guess.>

HARD RULES FROM THE DOCUMENTS

- <constraints an implementer could talk themselves out of, with the owning ADR.>

TESTS — AT MINIMUM WHAT SYSTEMS NAMES

- <each behaviour the checks section fixes, named as a test.>

DONE MEANS

- Gate green: <exact commands>, and CI green on the pull request.
- Every acceptance line in PRODUCT.md holds, each proved by a named test.
- One pull request, one branch, no follow-ups, no TODOs.

PROCESS

- Conventional commits, lowercase, single line; one pull request to <default branch>.
- Body: what changed, what was verified and how, what was left out.
- Request review from thani-sh and one peer agent. Do not merge.
- Never edit `AGENTS.md`: it is the organisation's entry file, copied unchanged. Update only the README lines the code makes untrue, plus the config example the slice extends.

IF YOU ARE BLOCKED Stop and ask. Name the document, line and decision that is missing or contradictory, and the smallest input that unblocks you. Do not guess, and do not ship a test that does not prove the claim.
