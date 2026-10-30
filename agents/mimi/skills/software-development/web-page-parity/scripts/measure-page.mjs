#!/usr/bin/env node
// Measure a page's rendered geometry: one JSON object on stdout, no dependencies.
// Requires Node >= 22 (global fetch + WebSocket) and a Chromium/Chrome on the machine.
//
//   node measure-page.mjs https://example.com/ --width 390 --height 844
//   node measure-page.mjs https://example.com/ --expr ./probe.js
//   node measure-page.mjs https://a.example/ --compare https://b.example/ --width 390
//
// --expr takes a file evaluated in the page that must return a JSON string. --compare runs
// the same probe against two URLs and prints the shared values plus the differing keys.
// Exits non-zero if the browser never comes up.

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const url = argv.find((a) => !a.startsWith('--'));
const flag = (name, fallback) => {
	const i = argv.indexOf(`--${name}`);
	return i === -1 ? fallback : argv[i + 1];
};
const has = (name) => argv.includes(`--${name}`);

if (!url) {
	console.error('usage: measure-page.mjs <url> [--width 390] [--height 844] [--expr file] [--compare url] [--port 9222] [--keep]');
	process.exit(2);
}

const WIDTH = Number(flag('width', 390));
const HEIGHT = Number(flag('height', 844));
const PORT = Number(flag('port', 9222));
const COMPARE = flag('compare');
const EXPR_FILE = flag('expr');
const KEEP = has('keep');

// The default probe is deliberately generic: it reports what a layout claim is made of.
const DEFAULT_PROBE = `(() => {
  const q = (s) => document.querySelector(s);
  const box = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
             right: Math.round(b.right), bottom: Math.round(b.bottom), cx: Math.round(b.x + b.width / 2) };
  };
  const css = (s, p) => { const el = q(s); return el ? getComputedStyle(el)[p] : null; };
  const root = document.documentElement;
  const header = q('header') || q('nav');
  return JSON.stringify({
    url: location.pathname,
    viewport: { w: innerWidth, h: innerHeight },
    page: {
      scrollWidth: root.scrollWidth,
      scrollHeight: root.scrollHeight,
      oneScreen: root.scrollHeight <= innerHeight + 1,
      noHorizontalScroll: root.scrollWidth <= innerWidth
    },
    header: { position: header ? getComputedStyle(header).position : null, box: box(header) },
    header_image: box(q('header img') || q('nav img')),
    header_links: box(q('header nav') || q('header .links')),
    h1: box(q('h1')),
    h1_colour: css('h1', 'color'),
    link_colour: css('a', 'color'),
    body_line_height: css('body', 'lineHeight'),
    body_padding: css('body', 'paddingTop'),
    links_in_main: document.querySelectorAll('main a').length,
    blocks: [...document.querySelectorAll('main > *')].map((el) => ({
      tag: el.tagName.toLowerCase(),
      cls: String(el.className),
      box: box(el)
    }))
  });
})()`;

const expression = EXPR_FILE ? readFileSync(EXPR_FILE, 'utf8') : DEFAULT_PROBE;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function findChrome() {
	if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
	const candidates = [
		'/opt/playwright/chromium-1243/chrome-linux64/chrome',
		'/usr/bin/chromium',
		'/usr/bin/chromium-browser',
		'/usr/bin/google-chrome',
		'/usr/bin/google-chrome-stable',
		'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
	];
	for (const candidate of candidates) {
		try {
			readFileSync(candidate);
			return candidate;
		} catch {}
	}
	// Playwright keeps browsers in a versioned directory; check both layouts when the
	// runtime offers a glob.
	const fs = require('node:fs');
	if (typeof fs.globSync === 'function') {
		for (const pattern of [
			'/opt/playwright/chromium-*/chrome-linux64/chrome',
			'**/.cache/ms-playwright/chromium-*/chrome-linux/chrome'
		]) {
			try {
				const [first] = fs.globSync(pattern, { withFileTypes: false });
				if (first) return first;
			} catch {}
		}
	}
	return null;
}

async function devtoolsWs() {
	for (let i = 0; i < 60; i++) {
		try {
			const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
			const json = await res.json();
			if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
		} catch {}
		await sleep(250);
	}
	throw new Error(`devtools never came up on port ${PORT}`);
}

async function newTarget(targetUrl) {
	// Chrome 111+ wants PUT here.
	const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(targetUrl)}`, {
		method: 'PUT'
	});
	if (!res.ok) throw new Error(`json/new returned ${res.status}`);
	return res.json();
}

function client(wsUrl) {
	const ws = new WebSocket(wsUrl);
	let id = 0;
	const pending = new Map();
	const events = [];
	ws.addEventListener('message', (event) => {
		const message = JSON.parse(event.data);
		if (message.id && pending.has(message.id)) {
			pending.get(message.id)(message);
			pending.delete(message.id);
		} else if (message.method) {
			events.push(message.method);
		}
	});
	const ready = new Promise((resolve, reject) => {
		ws.addEventListener('open', resolve);
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

async function measure(targetUrl) {
	const target = await newTarget('about:blank');
	const cdp = client(target.webSocketDebuggerUrl);
	await cdp.ready;
	await cdp.send('Page.enable');
	await cdp.send('Runtime.enable');
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: WIDTH,
		height: HEIGHT,
		deviceScaleFactor: 1,
		mobile: true
	});
	await cdp.send('Page.navigate', { url: targetUrl });
	for (let i = 0; i < 80 && !cdp.events.includes('Page.loadEventFired'); i++) await sleep(100);
	await sleep(400); // let web fonts settle before measuring text boxes
	const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true });
	cdp.close();
	const value = res.result?.result?.value;
	if (typeof value !== 'string') {
		throw new Error(`probe returned no value: ${JSON.stringify(res.result)}`);
	}
	return JSON.parse(value);
}

async function main() {
	const chrome = findChrome();
	if (!chrome) throw new Error('no chromium found; set CHROME_PATH to a chrome/chromium binary');
	const proc = spawn(
		chrome,
		[
			'--headless=new',
			'--no-sandbox',
			'--disable-gpu',
			'--disable-dev-shm-usage',
			`--remote-debugging-port=${PORT}`,
			`--user-data-dir=${join(tmpdir(), `measure-page-${Date.now()}`)}`,
			'about:blank'
		],
		{ stdio: 'ignore', detached: true }
	);
	try {
		await devtoolsWs();
		const left = await measure(url);
		if (!COMPARE) {
			console.log(JSON.stringify(left, null, 1));
			return;
		}
		const right = await measure(COMPARE);
		const same = {};
		const differing = {};
		for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
			if (JSON.stringify(left[key]) === JSON.stringify(right[key])) same[key] = left[key];
			else differing[key] = { [url]: left[key], [COMPARE]: right[key] };
		}
		console.log(JSON.stringify({ identical: Object.keys(same).length, same, differing }, null, 1));
	} finally {
		if (!KEEP) {
			try {
				process.kill(-proc.pid);
			} catch {
				try {
					proc.kill();
				} catch {}
			}
		}
	}
}

main().catch((err) => {
	console.error(`measure-page failed: ${err.message}`);
	process.exit(1);
});
