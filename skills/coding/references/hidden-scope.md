# Changes wider than their ask

Two changes look local and are not; neither throws, so nothing catches them.

- **A restyle named for some elements is not a licence for the page.** Change those, leave neighbours as they were, and name the mismatch for the operator to decide.
- **Collapsing data files into one drops container-inherited values.** A colour on the list, a default on the group: nothing fails, the item renders plainer. Bake the value onto each item, then replay the old resolution (`entry.color ?? emojiColor(entry.emoji) ?? list.color`) against `git show HEAD:<path>` and count mismatches. A test against the new file cannot see a value it never had.
