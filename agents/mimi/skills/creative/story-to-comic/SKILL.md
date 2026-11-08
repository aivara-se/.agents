---
name: story-to-comic
description: "Use when a story must become comic pages with image models."
version: 1.1.0
author: MiMi (Aivara)
license: MIT
when-to-use: "A story, script or beat sheet must become comic panels or pages, or an image pipeline must hold characters, sets and style across panels."
metadata:
  hermes:
    tags: [Comic, ImageGeneration, Storytelling, Consistency]
    category: creative
    related_skills: [grounded-citations, pdf, writing]
---

# Story to comic

For a series, generate panel art, not whole pages. For a cover or a one-shot, one call can draw the whole page. Lock each character, location and style to an approved reference image. Send those references to one editing model for every panel. Cost is usually not the constraint; identity drift is.

## When to Use

Use for a story, script or beat sheet that must become comic panels or pages. Use it for any image pipeline that must hold a character, a set or a style across many panels.

## Before the first panel

Three bibles. Nothing downstream starts until a human approves them.

- **Character sheet.** One turnaround per character: front, three-quarter, profile, full body, neutral light, plain background. Write one descriptor block — age, build, hair, eyes, scars, outfit — and reuse it word for word.
- **Location plate.** One establishing shot per set. Later shots reference the plate and state the camera and the light: "same room, camera from the kitchen door, late afternoon". Never rebuild a set from text alone.
- **Style plate.** One image that fixes line, palette and rendering. One style block in every prompt, one model and one seed family per series.

## Pipeline

1. Story to beats: page and beat list.
2. Beats to panel JSON: shot size, camera, action, characters, set, dialogue, caption.
3. Bibles: generate, review, approve. Stop here until approved.
4. Panel art: an edit call with character sheet, location plate and style plate. Ask for art only — no text, no borders — at the panel's aspect ratio.
5. QA: a vision model compares each panel with the sheet on hair, outfit, eyes, scars, props and set. Regenerate flagged panels only. A face-embedding score can gate this numerically.
6. Lettering: code places borders, gutters, captions and balloons from the same JSON.
7. Export: 300 dpi PNG for print, 1080 px WebP slices for webtoon. The JSON stays the source of truth.

`scripts/compose_page.py` does stage 6: `python compose_page.py page.json out/page-01.png`. It reads fractional `box` coordinates, so one spec reflows from a print page to a vertical webtoon.

## Panel JSON

```json
{
  "page": { "width_in": 6.625, "height_in": 10.25, "dpi": 300 },
  "panels": [
    {
      "box": [0, 0, 1, 0.4],
      "image": "art/p01.png",
      "caption": "...",
      "dialogue": [{ "text": "...", "at": [0.7, 0.2], "tail": [0.56, 0.46] }]
    }
  ]
}
```

`at` is the balloon centre and `tail` points at the speaker's mouth. Both are fractions of the panel. Keep text out of the image model: it cannot set type reliably, and re-lettering would mean regenerating art.

## Page mode

One call per page buys composition and style unity, and it costs less: a 4K page is $0.113 against five 1K panels at $0.168. It also loses identity. In a reviewed page the two leads changed face, beard and outfit between panels, Tamil lettering was malformed, and a phone's buttons were baked into one panel. Resolution does not fix this: 1K is 100 dpi at print size, 2K is 200 and 4K is 400. Pick by delivery target: a 1K panel is 1024 px, enough for a 1080 px webtoon; 2K for tall panels; 4K only for print.

Pre-generate the character sheets and location plates and pass them in. They raise similarity, but they do not decouple identity from resolution: a face drawn 45 px wide cannot carry a 1024 px reference.

## Webtoon on mobile

Deliver 1080 px wide, one column, vertical scroll. A 1K panel already meets the width, so 4K buys nothing. Stack panels; no spreads, no facing pages, no page turns. Body text 32 px or more, safe margin 40 px. Export WebP slices of 1600 to 2000 px. A 1080 x 1920 slice is a spec of 3.6 x 6.4 in at 300 dpi; the same fractional boxes reflow to print. The only page-mode shape that fits is a 1:4 strip at 4K, 1024 x 4096, four panels stacked; review it before shipping.

Use page mode for covers, one-shots, social strips and layout drafts. Do not use it for a series that must hold a face. Take the creative decisions in the layout plan, not in the pixels: the agent picks panel count, shapes, sizes, bleeds and reading flow; code renders each panel and composes the page.

## Rules that hold

- One model per series. A second model for "just this panel" breaks style faster than any prompt.
- Reference-conditioned editing holds identity better than text-to-image with references.
- Reference conditioning drifts on fine detail over a long run. Past roughly 150 panels, train a LoRA on 10 to 30 approved panels and keep those panels as the training set.
- Per-panel generation alone cannot hold a long sequence. Keep the QA pass, or a memory of earlier panels.
- Cheap models are for thumbnails and blocking. Never ship a panel from a model the series did not start with.
- Read the vendor's pricing and model page for a price or a capability. Aggregator tables disagree with each other and list models that do not exist. Cite the vendor page per `grounded-citations`.

## Pitfalls

- **Balloons overlap captions.** Draw the caption first, return its bottom edge, and treat that as a floor for every balloon in the panel. Shrink the font until the balloon fits. `compose_page.py` does this.
- **The model copies the reference pose.** State the action in the prompt and keep the reference count low; a high reference weight reproduces the pose instead of the character.
- **The model writes text into the art.** Strip it in the prompt, then reject any panel with letters in stage 5.
- **Cover-crop hides the subject.** Check each panel after the crop, not before. A square image cropped into a tall panel loses feet and props.
- **One aspect ratio for everything.** Generate at the panel's own ratio. Do not force a wide establishing shot into a tall panel.
- **A vision check can invent a clipped element.** When it reports a cut caption or a stray box, scan the render for the caption fill colour and compare the bands before editing the renderer. Background labels in placeholder art read as real defects; a fix on a false positive costs a render cycle.
- **Compare page-mode cost at equal acceptance.** One bad panel rerolls the whole page, so count attempts per accepted page, not per accepted panel.

## Cost

Model a 50-panel webtoon episode at 1.8 generations per panel, two references per call and 10 bible images: about $4.86 at lite prices. A 120-panel print issue with 30 bible images is about $10. Optimise consistency, not the last cent. `references/model-pricing.md` holds the verified matrix, free quotas, the local shortlist and the six-panel test protocol.
