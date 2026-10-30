#!/usr/bin/env bun

// Contrast ratios for a text colour on a ground, and on a panel composited over it.
// Pass the LIGHTEST stop of the gradient as the ground: that is where light text has the
// least separation, so it is the worst case.
//
//   bun run scripts/contrast.ts '#c9d1d9' '#171834'
//   bun run scripts/contrast.ts '#c9d1d9' '#171834' --panel '#161b22' 0.6
//
// AA is 4.5:1 for text, 3:1 for large text and UI edges.

type RGB = [number, number, number];

function parse(hex: string): RGB {
	const h = hex.trim().replace(/^#/, '');
	if (!/^[0-9a-fA-F]{6}$/.test(h)) {
		console.error(`Not a six-digit hex colour: ${hex}`);
		process.exit(2);
	}
	return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

function luminance([r, g, b]: RGB): number {
	const channel = (c: number) => {
		const s = c / 255;
		return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a: RGB, b: RGB): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

function over(panel: RGB, alpha: number, ground: RGB): RGB {
	return panel.map((c, i) => Math.round(c * alpha + ground[i] * (1 - alpha))) as RGB;
}

function hex([r, g, b]: RGB): string {
	return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

function verdict(value: number): string {
	if (value >= 4.5) return 'AA';
	return value >= 3 ? 'AA for large text and UI edges only' : 'FAILS AA';
}

const [textArg, groundArg, flag, panelArg, alphaArg] = process.argv.slice(2);
if (!textArg || !groundArg) {
	console.error('usage: contrast.ts <text-hex> <ground-hex> [--panel <hex> <alpha>]');
	process.exit(2);
}

const text = parse(textArg);
const ground = parse(groundArg);
const onGround = ratio(text, ground);

console.log(
	`${textArg} on ${groundArg}: ${onGround.toFixed(2)}:1 — ${verdict(onGround)}`
);

if (flag === '--panel' && panelArg && alphaArg) {
	const panel = over(parse(panelArg), Number(alphaArg), ground);
	const onPanel = ratio(text, panel);
	console.log(
		`  panel ${panelArg} at ${alphaArg} over that ground composites to ${hex(panel)}: ` +
			`${onPanel.toFixed(2)}:1 — ${verdict(onPanel)}`
	);
}
