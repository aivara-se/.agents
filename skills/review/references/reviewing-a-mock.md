# Reviewing a UI mock

A mock is a change, and it carries a contract. Judge it against the product's behaviour and the design's values, not against taste.

## Before you look

- Read the product document's `## Behaviour` and `## Scope`. Write the list of what the client must show and must never do.
- Read the design document's tokens, components and declared widths. The build follows the mock, so a drift is a defect.
- Name the head and every width you exercised in the review.
- A tunnel or preview URL is a running copy, not a commit: review the file at the branch head. Otherwise say the copy has no head and may differ. A verdict on an unversioned page cannot be re-read against what lands.

## Run it

- Serve it over `http://127.0.0.1`, never `file://`: the origin hides fetch, storage and service-worker behaviour.
- Open at every width the design names, and one below its breakpoint. Look for horizontal overflow, clipped text and overlapping panes.
- Exercise every control: filters, selection, disclosure, keyboard. A read-only client must offer no control that implies a change.
- Count what a filter returns and compare it with the group counts it claims. An empty result must say so.
- If the browser's screenshot path is host-side, render with a local headless Chromium and read that file:

```sh
/opt/playwright/chromium-*/chrome-linux64/chrome --headless=new --no-sandbox --hide-scrollbars --window-size=1440,900 --screenshot=/root/x.png <url>
```

- Compare the mock's vocabulary with the data model. A run that became an issue must not stay a run in the title, the search or the totals.
- A state style is a selector and an attribute. A rule for `[data-state="running"]` applies nothing when the markup carries `started`, so the designed status colour never renders. A token defined and never read (`grep 'var(--x)'`) is a dropped value, not a spare.

## Check against the product

- Map each behaviour line to a visible element. A promise with no element is a finding; the usual missing ones are the task's prompt, the verdict and the cost.
- The issue's cause is the operator's call, not a required line. The envelope — delivery id, size, signature, latency — is record data: a surface that prints it is a webhook log.
- Check the data both ways. A field the data defines and the render never reads is a dropped fact. A field the render invents is a promise nothing stores.
- Check the data model, not only the screen. A guarantee the engine owns, such as reading a postcondition, must not appear as a paid agent task.
- Sample data obeys the state rule. A task whose postcondition was read cannot stay pending, and a flow that advanced cannot keep its old verdict.
- Do not spend findings on mock arithmetic: the operator treats totals as noise. Verify a number only when the screen's purpose is that number.
- Compare computed styles with the design tokens: fills, radii, type sizes, widths. Measure; do not eyeball a near match. `scripts/contrast.py <fg> <bg>` prints a text colour's ratio on its surface; quote it.

## Information architecture

- One fact, one surface. A flow whose nodes repeat the task list's names and durations adds no state; a summary strip nested under the section it summarizes is mis-scoped.
- A screen opened to dig is not a dashboard. Cells that count what the alert already says, or an agent count of one, take the weight of the reason the operator is here.
- Read the page as the question it answers: why is this stuck? Check that the reason is the first thing on it.

## The report

- The verdict first. Each finding names the contract line it breaks and carries the number, input or output that shows it.
- State what must be true when it is fixed; the fix is the author's. A mock review is not a redesign: the prompt carries the defect and the evidence, never the method.
- Do not promote a finding into a product rule on your own word. A correction can over-correct. A removal aimed at the envelope took the cause with it, and only the operator could say the cause was never wanted.
- Group design-token drift into one finding; a list of pixels buries the defect.
- When the operator calls an absence intentional, retire the rule that demanded it. The document was the defect, and the author would restore what the operator refused.
