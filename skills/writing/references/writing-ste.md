# Simplified Technical English

Our prose follows the writing rules of ASD-STE100, the controlled English written for maintenance manuals. We keep the rules and leave the dictionary. Its 900 approved words forbid the vocabulary of this work, so the mechanics bind us and the terms stay ours.

The rules exist for a reader who is tired, hurried, or reading a second language. That reader parses a short sentence once, and a long one twice.

## The numbers

- An instruction or a step in a document: 20 words or less.
- A rule bullet in a `SKILL.md`: 30. A rule is a note, not a sentence a reader meets.
- A description, or any sentence in a paragraph: 25 words or less.
- A paragraph: six sentences on one topic.
- A noun cluster: three words at most. Write "the limit for pull request size", not "pull request size limit".
- One instruction per sentence.

## The rules that carry

- Write in the imperative for a step: "Run the gate", not "the gate should be run".
- Name the actor: "The job writes the row", not "the row is written".
- Keep the article and the subject. Dropped words make a reader guess.
- Use present tense for what the code does, past tense for what a run did.
- One term for one item, every time. Choose it at first use and repeat it; a synonym is a second item to the reader.
- Choose the short common word: start, not initiate; use, not utilise; about, not approximately.
- No contraction: "do not", "it is", "cannot".
- No Latin abbreviation: "that is" and "for example", never `i.e.` or `e.g.`.
- No idiom, metaphor, joke or rhetorical question. A finding is not "a smoking gun"; it is the line and the input.
- Explain a specialist term on first use, in the same sentence or the next.

## The rewrites

```text
Before: In order to ensure that the deployment completes successfully, it is
important that the operator verifies the configuration before proceeding.

After:  Check the configuration before you deploy. A wrong value stops the deploy.
```

```text
Before: The row is written by the job when the lease has expired and no other
process holds it.

After:  The job writes the row when the lease expires and no process holds it.
```

```text
Before: Implementation of the retry limit reduction was carried out in order to
improve throughput.

After:  We cut the retry limit to raise throughput.
```

## What the rules do not touch

- Code, identifiers, paths, commands, error text and quoted output keep their form.
- A quotation from another author stays word for word, with its attribution.
- The public blog and the aivara.se site copy keep their own voice. They speak to visitors, so the register is casual; the length rule still applies.

## When you check your own text

Read it aloud once. A sentence you run out of breath in is two sentences. Then count: `wc -w` a paragraph and divide by its sentence count.
