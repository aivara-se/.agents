# What a finding must pass

A finding is posted only when all of these hold. The verdict vocabulary is in `review`'s `SKILL.md`.

- The premise still stands. If an operator decision or a merged change removed it, the verdict is `block`.
- It is true. You reproduced it, and the reply carries the command and its output.
- It is the bytes. A finding about a literal is a claim about the file: print the characters with `od -c` or `grep -F`. An escaping reader can show a backslash the file does not hold.
- A check is vacuous only when its log shows nothing ran. An inference from the file tree is not a log.
- It is the change's to fix. Name the contract line it misses or breaks. Work the item never asked for is an issue.
- It is a correction, not an addition: no new field, file, abstraction or gate. A fix that grows the change needs a criterion.
- A check can come from a default-setup scan (CodeQL) that no workflow file owns: read `gh run list --branch <default>`.
- The title obeys `writing`. Name the replacement when a formula opener hides it.
