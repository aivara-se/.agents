# Changes wider than their ask

Two changes look local and are not. Neither throws, so nothing catches them.

## A restyle named for some elements

When the operator names the elements — these lines go, this row becomes pills, this icon — change those and leave the neighbouring sections structurally as they were. Even when the result reads half-styled beside what you built, that mismatch is not a defect you close.

That mismatch is the operator's next decision, not a defect you close: name it in one line (what still looks unlike the rest, what you would change) and let them ask. Silently extending the restyle is the same error as adding an unasked feature, and it costs a review round to unwind.

## Collapsing several data files into one

A value resolved through its container — a colour on the list, a default on the group — has no home once the containers merge. The types still check, the item still renders, plainer than before.

Bake the inherited value onto each item during the merge, then prove the merge changed nothing by replaying the old resolution rule (`entry.color ?? emojiColor(entry.emoji) ?? list.color`) against `git show HEAD:<path>` for every item and counting mismatches. A test written against the new file cannot see a value it never had.
