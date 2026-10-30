# Handover: implement <the thing> — one pull request

Implement <the thing> as described by this repository's documents, in one pull request, without changing the design.

REPOSITORY
<owner>/<repo> — clone to ~/github/<owner>/<repo> and branch from an up-to-date <default branch>.

READ FIRST, IN THIS ORDER
- AGENTS.md — the entry file and the house rules.
- README.md — how it builds, runs and deploys.
- docs/PRODUCT.md — the behaviour and the acceptance.
- docs/SYSTEMS.md — the architecture, the request path, the failure modes, the checks.
- docs/adrs/ — the decisions.
- aivara-se/.agents — the coding and testing skills for this organisation.

THE DOCUMENTS ARE THE SPECIFICATION, AND THE DESIGN IS FROZEN
PRODUCT.md, SYSTEMS.md and the ADRs are authoritative. Do not edit them, do not reinterpret them, and do not add a second home for anything they say. If two documents disagree, or a step cannot be built as written, STOP and ask me. Do not pick a reading, do not weaken a rule to make something pass, and do not invent a mechanism.

BUILD THE WHOLE OF <v1> IN ONE BRANCH AND ONE PR
- <the files and packages, one line each: what it is and the document it implements.>

GAPS THE DOCUMENTS LEAVE OPEN — TAKE THESE READINGS
- <each gap the documents do not close, the reading you expect, and where to say so in the pull request. A value only the operator knows (a host path, a credential reference, a roster) is a question to ask, not a value to guess.>

HARD RULES FROM THE DOCUMENTS
- <the constraints an implementer could otherwise talk themselves out of, one line each, with the ADR that owns each.>

TESTS — AT MINIMUM WHAT SYSTEMS NAMES
- <each behaviour the checks section fixes, named as a test.>

DONE MEANS
- The gate is green: <the exact commands>, and CI green on the pull request.
- Every acceptance line in PRODUCT.md holds, and you name the test that proves each one.
- One pull request, one branch, no follow-ups, no TODOs.

PROCESS
- Conventional commits, lowercase, single line; one pull request to <default branch>.
- The pull request body: what changed, what was verified and with which command, and what was left out.
- Request review from thani-sh and one peer agent. Do not merge.
- Update only AGENTS.md's Current Project Focus and Repository Structure map, and any README line the code makes untrue. No other documentation edits.

IF YOU ARE BLOCKED
Stop and ask me. Name the exact document, line and decision that is missing or contradictory, and the smallest input that would unblock you. Do not guess a value, do not change the design, and do not ship a test that does not prove the claim.
