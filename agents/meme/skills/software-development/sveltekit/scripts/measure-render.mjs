// Measure rendered pages numerically — the review of a geometry-only change when no
// one can see a screenshot. For every named selector group: text, box, font-size,
// weight, letter-spacing, family, computed colour, line height, plus document height,
// horizontal-overflow flag and the console error list. Numbers are the evidence: exact
// gaps, centreing, the fold, and that nothing scrolled.
// Usage: node measure-render.mjs [spec.json]   (default: ./measure-spec.json)
// spec:
// { "base": "http://localhost:8788",
//   "pages": [{ "name": "home-desktop", "url": "/", "width": 1280, "height": 800,
//               "groups": { "h1": "h1", "rows": ".row", ... } }] }
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const specPath = process.argv[2] ?? './measure-spec.json';
const spec = JSON.parse(readFileSync(specPath, 'utf8'));

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const out = [];

for (const p of spec.pages) {
	const context = await browser.newContext({ viewport: { width: p.width, height: p.height } });
	const page = await context.newPage();
	const errors = [];
	page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
	await page.goto(spec.base + p.url, { waitUntil: 'networkidle' });

	const info = await page.evaluate((groups) => {
		const grab = (el) => {
			const r = el.getBoundingClientRect();
			const s = getComputedStyle(el);
			return {
				text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 70),
				x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
				fs: s.fontSize, fw: s.fontWeight, ls: s.letterSpacing,
				font: s.fontFamily.split(',')[0].replace(/["']/g, ''),
				color: s.color, lh: s.lineHeight
			};
		};
		const result = {
			docH: document.documentElement.scrollHeight,
			hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
			title: document.title,
			groups: {}
		};
		for (const [name, sel] of Object.entries(groups)) {
			result.groups[name] = Array.from(document.querySelectorAll(sel)).map(grab);
		}
		return result;
	}, p.groups);

	out.push(`\n===== ${p.name} (${p.width}x${p.height}, docH=${info.docH}, hscroll=${info.hscroll}, title=${info.title}, errors=${errors.length}) =====`);
	for (const [name, items] of Object.entries(info.groups)) {
		out.push(`|-- ${name} (${items.length})`);
		for (const item of items) out.push(`   ${JSON.stringify(item)}`);
	}
	await context.close();
}

await browser.close();
console.log(out.join('\n'));