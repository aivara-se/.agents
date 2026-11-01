---
name: architecture-diagram
description: "Dark-themed SVG architecture/cloud/infra diagrams as HTML."
version: 1.0.0
author: Cocoon AI (hello@cocoon-ai.com), ported by Hermes Agent
license: MIT
dependencies: []
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags:
      [architecture, diagrams, SVG, HTML, visualization, infrastructure, cloud]
    related_skills: [concept-diagrams, hand-drawn-diagrams]
---

# Architecture Diagram Skill

Generate dark-themed technical architecture diagrams as one standalone HTML file with inline SVG. No external tools, no API keys, no rendering library — write the file and open it in a browser.

## Scope

**Best suited for:** software system architecture (frontend / backend / database layers), cloud infrastructure (VPC, regions, subnets, managed services), service-mesh topology, database + API maps, deployment diagrams — anything tech-infra that fits a dark, grid-backed aesthetic.

**Look elsewhere first for:** science subjects (physics, chemistry, math, biology), physical objects (vehicles, hardware, anatomy), floor plans and narrative journeys, hand-drawn whiteboard sketches — `hand-drawn-diagrams` (Excalidraw-style SVG, rasterised to PNG), animated explainers.

If a more specialised skill exists for the subject, prefer it. If none fits, this skill is a general SVG fallback; the output keeps the dark tech aesthetic.

Based on [Cocoon AI's architecture-diagram-generator](https://github.com/Cocoon-AI/architecture-diagram-generator) (MIT).

## Workflow

1. The user describes components, connections and technologies.
2. Generate the HTML following the design system below, and save it with `write_file` — a user-specified path, or `./[project-name]-architecture.html`.

Then suggest they open it: `open ./my-architecture.html` on macOS, `xdg-open ./my-architecture.html` on Linux. It works offline.

## Design System & Visual Language

### Color Palette (Semantic Mapping)

| Component Type  | Fill (rgba)               | Stroke (Hex)            |
| :-------------- | :------------------------ | :---------------------- |
| **Frontend**    | `rgba(8, 51, 68, 0.4)`    | `#22d3ee` (cyan-400)    |
| **Backend**     | `rgba(6, 78, 59, 0.4)`    | `#34d399` (emerald-400) |
| **Database**    | `rgba(76, 29, 149, 0.4)`  | `#a78bfa` (violet-400)  |
| **AWS/Cloud**   | `rgba(120, 53, 15, 0.3)`  | `#fbbf24` (amber-400)   |
| **Security**    | `rgba(136, 19, 55, 0.4)`  | `#fb7185` (rose-400)    |
| **Message Bus** | `rgba(251, 146, 60, 0.3)` | `#fb923c` (orange-400)  |
| **External**    | `rgba(30, 41, 59, 0.5)`   | `#94a3b8` (slate-400)   |

### Typography & Background

JetBrains Mono from Google Fonts. Sizes: 12px names, 9px sublabels, 8px annotations, 7px tiny labels. Background Slate-950 (`#020617`) with a subtle 40px grid:

```svg
<!-- Background Grid Pattern -->
<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="0.5"/>
</pattern>
```

## Technical Implementation Details

### Component Rendering

Rounded rectangles (`rx="6"`) with 1.5px strokes. To stop arrows showing through a semi-transparent fill, use **double-rect masking**: draw an opaque background rect (`#0f172a`), then the semi-transparent styled rect on top.

### Connection Rules

- **Z-Order:** draw arrows _early_ (after the grid) so they render behind the boxes.
- **Arrowheads:** SVG markers.
- **Security flows:** dashed lines in rose (`#fb7185`).
- **Boundaries:** security groups dashed (`4,4`) in rose; regions large-dashed (`8,4`) in amber with `rx="12"`.

### Spacing & Layout

- **Height:** 60px for services, 80-120px for large components.
- **Vertical gap:** minimum 40px.
- **Message buses:** _in the gap_ between services, never overlapping them.
- **Legend placement:** **CRITICAL.** It goes outside every boundary box — find the lowest boundary Y and place the legend at least 20px below it.

## Document Structure

Four parts: a header (title with a pulsing dot, subtitle), the main SVG inside a rounded border card, a grid of three summary cards, and a minimal footer.

## Output Requirements

- **Single file:** one self-contained `.html`.
- **No external dependencies:** all CSS and SVG inline, except Google Fonts.
- **No JavaScript:** pure CSS for animations such as the pulsing dots.
- **Compatibility:** it must render in any modern browser.

## Template Reference

Load the full template for the exact structure, CSS and component examples:

```
skill_view(name="architecture-diagram", file_path="templates/template.html")
```

It has working examples of every component type (frontend, backend, database, cloud, security), arrow styles (standard, dashed, curved), security groups, region boundaries and the legend — use it as the structural reference.
