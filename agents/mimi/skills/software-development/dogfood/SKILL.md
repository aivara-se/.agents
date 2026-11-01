---
name: dogfood
description: "Exploratory QA of web apps: find bugs, evidence, reports."
version: 1.0.0
author: Teknium (teknium1), Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [qa, testing, browser, web, dogfood]
    related_skills: []
---

# Dogfood: systematic web application QA

## Inputs

A target URL, a scope (or "full site"), and an output directory (default `./dogfood-output`) holding `screenshots/` and `report.md`.

## Phase 1: Plan

List the pages and flows to cover: landing page; header, footer and sidebar links; key flows (sign up, login, search, checkout); forms and interactive elements; edge cases (empty states, error pages, 404s).

## Phase 2: Explore

For each page: `browser_navigate`, then `browser_snapshot` for the DOM, then `browser_console(clear=true)`. Check the console after every navigation and every significant interaction — silent JS errors are the highest-value finding.

`browser_vision(question="Describe the layout and any visual, broken or accessibility issues", annotate=true)` overlays numbered `[N]` labels on interactive elements; each maps to ref `@eN` for later commands.

Then drive the elements: `browser_click(ref="@eN")`, `browser_type(ref="@eN", text="test input")`, `browser_press(key="Tab")`, `browser_scroll(direction="down")`, plus invalid entries and empty submissions. After each interaction check `browser_console()` and `browser_vision(question="What changed after the interaction?")` against what you expected.

## Phase 3: Evidence

Per issue: a screenshot (`browser_vision(question="Capture and describe the issue", annotate=false)`, keeping its `screenshot_path`), the URL, steps to reproduce, expected vs actual, and any console error. Classify severity (Critical / High / Medium / Low) and category (Functional / Visual / Accessibility / Console / UX / Content) with `references/issue-taxonomy.md`.

## Phase 4: Categorise

De-duplicate: one bug in several places is one issue. Assign final severity and category, sort Critical first, and count by severity and category for the summary.

## Phase 5: Report

Write `{output_dir}/report.md` from `templates/dogfood-report-template.md`. It carries an executive summary (total, breakdown by severity, scope); per issue its number, title, badges, URL, description, steps, expected vs actual, `MEDIA:<screenshot_path>` and console errors; a summary table; and testing notes — what was tested, what was not, any blockers.

## Tips

- **For a layout claim, measure it instead of describing it.** When the question is "is this centred / one screen / identical to the reference", the `web-page-parity` skill's `scripts/measure-page.mjs` reads `getBoundingClientRect`, `getComputedStyle` and `scrollHeight` over CDP and prints JSON — quotable evidence where a screenshot is an opinion.
- Give the user `MEDIA:<screenshot_path>` so the evidence shows inline.
