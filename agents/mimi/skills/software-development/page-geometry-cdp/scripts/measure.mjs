// Print a page's real geometry as one JSON line, over CDP. No dependencies.
//
//   node measure.mjs <url> [width] [height] [expression-file]
//
// Start the browser first (see SKILL.md), then call this. The expression file replaces the
// built-in one, which is how you measure a page whose class names differ from another's.
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://127.0.0.1:8788/';
const W = Number(process.argv[3] ?? 390);
const H = Number(process.argv[4] ?? 844);
const EXPR_FILE = process.argv[5];
const PORT = Number(process.env.CDP_PORT ?? 9222);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function findBrowser() {
	for (let i = 0; i < 40; i++) {
		try {
			const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
			const json = await res.json();
			if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
		} catch {}
		await sleep(250);
	}
	throw new Error('devtools never came up — is the browser running?');
}

async function newTarget(url) {
	const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, {
		method: 'PUT'
	});
	if (!res.ok) throw new Error(`json/new → HTTP ${res.status}`);
	return res.json();
}

function client(wsUrl) {
	const ws = new WebSocket(wsUrl);
	let id = 0;
	const pending = new Map();
	const events = [];
	ws.addEventListener('message', (e) => {
		const msg = JSON.parse(e.data);
		if (msg.id && pending.has(msg.id)) {
			pending.get(msg.id)(msg);
			pending.delete(msg.id);
		} else if (msg.method) {
			events.push(msg.method);
		}
	});
	const ready = new Promise((resolve, reject) => {
		ws.addEventListener('open', () => resolve());
		ws.addEventListener('error', () => reject(new Error('websocket error')));
	});
	const send = (method, params = {}) =>
		new Promise((resolve) => {
			const n = ++id;
			pending.set(n, resolve);
			ws.send(JSON.stringify({ id: n, method, params }));
		});
	return { ready, send, events, close: () => ws.close() };
}

// Project down to a small object: rects and the computed values that decide the claim.
const defaultExpression = `(() => {
	const q = (s) => document.querySelector(s);
	const r = (el) => {
		if (!el) return null;
		const b = el.getBoundingClientRect();
		return {
			x: Math.round(b.x), y: Math.round(b.y),
			w: Math.round(b.width), h: Math.round(b.height),
			right: Math.round(b.right), bottom: Math.round(b.bottom),
			cx: Math.round(b.x + b.width / 2)
		};
	};
	const cs = (s, p) => {
		const el = q(s);
		return el ? getComputedStyle(el)[p] : null;
	};
	return JSON.stringify({
		viewport: { w: innerWidth, h: innerHeight },
		page_height: document.documentElement.scrollHeight,
		one_screen: document.documentElement.scrollHeight <= innerHeight + 1,
		horizontal_scroll: document.documentElement.scrollWidth > innerWidth,
		body: r(document.body),
		h1: r(q('h1')),
		first_link: r(q('a')),
		link_colour: cs('a', 'color'),
		body_font: cs('body', 'fontFamily'),
		body_line_height: cs('body', 'lineHeight')
	});
})()`;

const run = async () => {
	const target = await newTarget('about:blank');
	const cdp = client(target.webSocketDebuggerUrl);
	await cdp.ready;
	await cdp.send('Page.enable');
	await cdp.send('Runtime.enable');
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: W,
		height: H,
		deviceScaleFactor: 1,
		mobile: true
	});
	await cdp.send('Page.navigate', { url: BASE });
	for (let i = 0; i < 80 && !cdp.events.includes('Page.loadEventFired'); i++) await sleep(100);
	await sleep(400);

	const res = await cdp.send('Runtime.evaluate', {
		expression: EXPR_FILE ? readFileSync(EXPR_FILE, 'utf8') : defaultExpression,
		returnByValue: true
	});
	const value = res.result?.result?.value;
	console.log(value ?? JSON.stringify(res.result ?? res));
	cdp.close();
};

run().catch((err) => {
	console.error(`FAILED: ${err.message}`);
	process.exit(1);
});
