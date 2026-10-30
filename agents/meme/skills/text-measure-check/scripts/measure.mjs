// Counts characters per rendered line of a prose file, in the note column at
// each width, in Chromium with the repository's own woff2 files.
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/playwright node measure.mjs \
//     <repo> <font.woff2> <family> <weight> <prose.md> 640 544
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const { chromium } = createRequire("/usr/local/lib/node_modules/")("playwright");

const [repo, fontFile, family, weight, prosePath, ...widths] = process.argv.slice(2);
const font = readFileSync(`${repo}/src/frontend/fonts/${fontFile}`).toString("base64");

// Prose only: drop headings, join a paragraph's lines, drop the markers.
const paragraphs = readFileSync(prosePath, "utf8")
  .split(/\n\s*\n/)
  .map((p) => p.split("\n").filter((l) => l.trim()).join(" "))
  .filter((p) => p && !p.startsWith("#"))
  .map((p) => p.replace(/\*\*/g, "").replace(/^-\s+/, "").replace(/\s+/g, " ").trim());

const divs = paragraphs
  .map((p) => `<div class="note">${p.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>`)
  .join("\n");

const browser = await chromium.launch({ args: ["--no-sandbox"] });
for (const px of widths.map(Number)) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 4000 } });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:400 700;font-style:normal;font-display:block}
body{margin:0}
.note{display:block;width:${px}px;padding:0;font-family:"${family}",serif;font-size:19px;font-weight:${weight};line-height:1.65;font-optical-sizing:auto;font-kerning:normal;font-variant-ligatures:common-ligatures contextual;white-space:pre-wrap}
</style>${divs}`);
  const result = await page.evaluate(async () => {
    await document.fonts.ready;
    const counts = [];
    for (const note of document.querySelectorAll(".note")) {
      const node = note.firstChild;
      const lines = [""];
      let prevLeft = -1;
      for (let i = 0; i < node.length; i++) {
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        const rect = range.getBoundingClientRect();
        if (!rect.height) continue;
        if (rect.left <= prevLeft && lines[lines.length - 1]) lines.push("");
        prevLeft = rect.left;
        lines[lines.length - 1] += node.data[i];
      }
      // the last line of a paragraph is partial
      counts.push(...lines.slice(0, -1).map((l) => l.trimEnd().length));
    }
    counts.sort((a, b) => a - b);
    return { counts, loaded: [...document.fonts].map((f) => `${f.family}:${f.status}`).join(" ") };
  });
  const c = result.counts;
  console.log(
    `${family} ${weight} @${px}px: lines ${c.length}  median ${c[Math.floor(c.length / 2)]}  widest ${c.at(-1)}  narrowest ${c[0]}  [${result.loaded}]`,
  );
  await page.close();
}
await browser.close();
