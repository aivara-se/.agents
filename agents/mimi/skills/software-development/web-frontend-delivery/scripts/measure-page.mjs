#!/usr/bin/env node
// Measure a page in a real browser: element boxes, computed styles, phone viewport.
// Drives the Chromium binary over CDP with Node's own fetch and WebSocket, so no driver
// package and no bundled browser tool are involved.
//
// usage: node measure-page.mjs <url> [width] [height] [expressionFile]
//        CHROME=/path/to/chrome node measure-page.mjs <url> 390 844
//
// Run it against the page a change replaces and against the new page at the same viewport,
// then diff the two JSON blobs. Identical values are the evidence; a differing value is
// either a real drift or a copy change you meant.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [url, w = '390', h = '844', exprFile] = process.argv.slice(2);
if (!url) {
	console.error('usage: node measure-page.mjs <url> [width] [height] [expressionFile]');
	process.exit(2);
}
const WIDTH = Number(w);
const HEIGHT = Number(h);
const PORT = Number(process.env.CDP_PORT ?? 9223);

// The default probe: the shared skeleton of a page — a sticky/absolute header, a portrait,
// a nav block, a hero, a footer — plus the styles that move geometry without markup changes.
const DEFAULT_PROBE = `(() => {
	const box = (sel) => {
		const el = document.querySelector(sel);
		if (!el) return null;
		const b = el.getBoundingClientRect();
		return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
			right: Math.round(b.right), bottom: Math.round(b.bottom), cx: Math.round(b.x + b.width / 2) };
	};
	const style = (sel, prop) => {
		const el = document.querySelector(sel);
		return el ? getComputedStyle(el)[prop] : null;
	};
	return JSON.stringify({
		viewport: { w: innerWidth, h: innerHeight },
		page_height: document.documentElement.scrollHeight,
		one_screen: document.documentElement.scrollHeight <= innerHeight + 1,
		horizontal_scroll: document.documentElement.scrollWidth > innerWidth,
		header_position: style('nav, header', 'position'),
		first_image: box('img'),
		primary_heading: box('h1'),
		footer_bottom_gap: document.querySelector('footer')
			? Math.round(innerHeight - document.querySelector('footer').getBoundingClientRect().bottom)
			: null,
		link_colour: style('a', 'color'),
		body_line_height: getComputedStyle(document.body).lineHeight
	});
})()`;

// Chromium lives in different places depending on what installed it: look, do not assume.
function findChrome() {
	if (process.env.CHROME && existsSync(process.env.CHROME)) return process.env.CHROME;
	const direct = [
		'/usr/bin/chromium',
		'/usr/bin/chromium-browser',
		'/usr/bin/google-chrome',
		'/usr/bin/google-chrome-stable',
		'/opt/google/chrome/chrome'
	];
	for (const p of direct) if (existsSync(p)) return p;

	const homes = [process.env.HOME ?? '', '/opt', '/root'];
	const parents = [
		...homes.flatMap((b) => [join(b, '.cache', 'ms-playwright'), join(b, '.cache', 'puppeteer'), b]),
		'/opt/playwright'
	];
	const suffixes = [
		join('chrome-linux64', 'chrome'),
		join('chrome-linux', 'chrome'),
		join('chrome-headless-shell-linux64', 'chrome-headless-shell')
	];
	for (const parent of parents) {
		if (!parent || !existsSync(parent)) continue;
		let entries = [];
		try {
			entries = readdirSync(parent);
		} catch {
			continue;
		}
		for (const entry of entries) {
			for (const suffix of suffixes) {
				const candidate = join(parent, entry, suffix);
				if (existsSync(candidate)) return candidate;
			}
		}
	}
	return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDevtools() {
	for (let i = 0; i < 60; i++) {
		try {
			const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
			const json = await res.json();
			if (json.webSocketDebuggerUrl) return;
		} catch {}
		await sleep(250);
	}
	throw new Error(`no devtools endpoint on port ${PORT}`);
}

function connect(wsUrl) {
	const ws = new WebSocket(wsUrl);
	let id = 0;
	const pending = new Map();
	const events = [];
	ws.addEventListener('message', (event) => {
		const msg = JSON.parse(event.data);
		if (msg.id && pending.has(msg.id)) {
			pending.get(msg.id)(msg);
			pending.delete(msg.id);
		} else if (msg.method) {
			events.push(msg.method);
		}
	});
	const ready = new Promise((resolve, reject) => {
		ws.addEventListener('open', () => resolve());
		ws.addEventListener('error', () => reject(new Error('devtools websocket failed')));
	});
	const send = (method, params = {}) =>
		new Promise((resolve) => {
			const n = ++id;
			pending.set(n, resolve);
			ws.send(JSON.stringify({ id: n, method, params }));
		});
	return { ready, send, events, close: () => ws.close() };
}

async function main() {
	const chrome = findChrome();
	if (!chrome) throw new Error('no chromium binary found — set CHROME=/path/to/chrome');

	const profile = mkdtempSync(join(tmpdir(), 'measure-profile-'));
	const browser = spawn(
		chrome,
		[
			'--headless=new',
			'--no-sandbox',
			'--disable-gpu',
			'--disable-dev-shm-usage',
			`--remote-debugging-port=${PORT}`,
			`--user-data-dir=${profile}`,
			'about:blank'
		],
		{ stdio: 'ignore' }
	);

	try {
		await waitForDevtools();
		const target = await (
			await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, {
				method: 'PUT'
			})
		).json();

		const client = connect(target.webSocketDebuggerUrl);
		await client.ready;
		await client.send('Page.enable');
		await client.send('Runtime.enable');
		// The viewport the page will actually be read at: a phone by default.
		await client.send('Emulation.setDeviceMetricsOverride', {
			width: WIDTH,
			height: HEIGHT,
			deviceScaleFactor: 1,
			mobile: true
		});
		await client.send('Page.navigate', { url });
		for (let i = 0; i < 100 && !client.events.includes('Page.loadEventFired'); i++) await sleep(100);
		await sleep(400); // fonts settle, the first paint lands

		const probe = exprFile ? readFileSync(exprFile, 'utf8') : DEFAULT_PROBE;
		const result = await client.send('Runtime.evaluate', { expression: probe, returnByValue: true });
		const value = result.result?.result?.value;
		console.log(value ?? JSON.stringify(result.result ?? result));
		client.close();
	} finally {
		browser.kill('SIGKILL');
		rmSync(profile, { recursive: true, force: true });
	}
}

main().catch((error) => {
	console.error(`measure-page failed: ${error.message}`);
	process.exit(1);
});
