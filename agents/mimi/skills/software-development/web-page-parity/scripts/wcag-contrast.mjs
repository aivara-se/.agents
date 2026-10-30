#!/usr/bin/env node
// WCAG contrast ratios for a matrix of colours: every foreground against every surface.
//
//   node wcag-contrast.mjs '#171834,#161a29' '#e6edf3,#c9d1d9,#8b949e'
//   node wcag-contrast.mjs --composite 'rgba(22,27,34,0.6)' '#171834' '#e6edf3,#c9d1d9'
//
// Matrix mode: the first list is the surfaces, the rest are foregrounds.
// Composite mode: renders an rgba() panel over a hex surface and prints the resulting
// opaque colour and every foreground's ratio against it — the card-on-a-ground case.
// Measure against the LIGHTEST ground stop: that is the worst case for light text.

const args = process.argv.slice(2);

const toRgb = (hex) => {
	const clean = hex.trim().replace('#', '');
	const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
	return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};

const parseRgba = (value) => {
	const match = value.match(/rgba?\(([^)]+)\)/i);
	if (match) {
		const parts = match[1].split(',').map((p) => Number(p.trim()));
		return { rgb: parts.slice(0, 3), alpha: parts.length > 3 ? parts[3] : 1 };
	}
	return { rgb: toRgb(value), alpha: 1 };
};

const channel = (c) => {
	const v = c / 255;
	return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

const ratio = (a, b) => {
	const la = luminance(a);
	const lb = luminance(b);
	return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const hex = ([r, g, b]) =>
	'#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');

const flatten = ({ rgb, alpha }, surface) => rgb.map((c, i) => c * alpha + surface[i] * (1 - alpha));

const verdict = (r) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA-large only' : 'fails AA');

const list = (value) => (value ?? '').split(',').map((v) => v.trim()).filter(Boolean);

const compositeAt = args.indexOf('--composite');

if (compositeAt !== -1) {
	const panel = parseRgba(args[compositeAt + 1]);
	const surfaces = list(args[compositeAt + 2]).map(toRgb);
	const foregrounds = list(args[compositeAt + 3] ?? args[0]).map(toRgb);
	for (const surface of surfaces) {
		const flat = flatten(panel, surface);
		console.log(`panel ${args[compositeAt + 1]} over ${hex(surface)} composites to ${hex(flat)}`);
		for (const fg of foregrounds) {
			const r = ratio(fg, flat);
			console.log(`  ${hex(fg)}: ${r.toFixed(2)}:1  ${verdict(r)}`);
		}
	}
	process.exit(0);
}

if (args.length < 2) {
	console.error(
		"usage: wcag-contrast.mjs '<surfaces>' '<fg,fg>' | wcag-contrast.mjs --composite 'rgba(...)' '<surface>' '<fg,fg>'"
	);
	process.exit(2);
}

const surfaces = list(args[0]).map(toRgb);
const foregrounds = args.slice(1).flatMap(list).map(toRgb);

for (const surface of surfaces) {
	console.log(`${hex(surface)}:`);
	for (const fg of foregrounds) {
		const r = ratio(fg, surface);
		console.log(`  ${hex(fg)}: ${r.toFixed(2)}:1  ${verdict(r)}`);
	}
}
