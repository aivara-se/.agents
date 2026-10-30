#!/usr/bin/env node
// The browser pass for a built page: load it in headless Chromium over CDP, collect console
// errors and uncaught exceptions, detect the framework's error page and horizontal overflow,
// report the key boxes, and save a full-page screenshot.
//
//   node render-check.mjs <url> [width=1440] [out.png] [expressionFile]
//
// CHROME=/path/to/chrome overrides the binary. The expression file is evaluated in the page
// after load and printed under "expression", for measuring a page or diffing two of them.
// Exit 1 when a console error, an exception, the error page or sideways scroll is found.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [, , url, widthArg, outArg, expressionArg] = process.argv;
if (!url) {
	console.error('usage: node render-check.mjs <url> [width] [out.png] [expressionFile]');
	process.exit(2);
}

const width = Number(widthArg || 1440);
const out = outArg || 'render-check.png';
const chromePath =
	process.env.CHROME || '/opt/playwright/chromium-1243/chrome-linux64/chrome';
if (!existsSync(chromePath)) {
	console.error(`no Chromium at ${chromePath}; set CHROME=`);
	process.exit(2);
}

const port = 9300 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), 'render-check-'));
const chrome = spawn(
	chromePath,
	[
		'--headless=new',
		'--disable-gpu',
		'--no-sandbox',
		'--hide-scrollbars',
		'--no-first-run',
		`--user-data-dir=${profile}`,
		`--remote-debugging-port=${port}`,
		'--window-size=' + width + ',900',
		'about:blank'
	],
	{ stdio: 'ignore' }
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let target;
for (let i = 0; i < 60; i++) {
	await sleep(150);
	try {
		const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
		target = list.find((entry) => entry.type === 'page');
		if (target) break;
	} catch {}
}
if (!target) {
	chrome.kill();
	throw new Error('Chromium did not expose a debug target');
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => (ws.onopen = resolve));

let nextId = 0;
const pending = new Map();
const consoleErrors = [];
const exceptions = [];
let loaded;
let loadResolve;

ws.onmessage = (event) => {
	const message = JSON.parse(event.data);
	if (message.id && pending.has(message.id)) {
		pending.get(message.id)(message);
		pending.delete(message.id);
		return;
	}
	if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
		consoleErrors.push(
			message.params.args
				.map((arg) => arg.value ?? arg.description ?? arg.type)
				.join(' ')
				.slice(0, 500)
		);
	}
	if (message.method === 'Runtime.exceptionThrown') {
		const detail = message.params.exceptionDetails;
		exceptions.push(
			(detail.exception?.description || detail.text || 'exception').slice(0, 500)
		);
	}
	if (message.method === 'Page.loadEventFired') loadResolve?.();
};

function cdp(method, params = {}) {
	return new Promise((resolve, reject) => {
		const id = ++nextId;
		pending.set(id, (message) =>
			message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result)
		);
		ws.send(JSON.stringify({ id, method, params }));
	});
}

await cdp('Page.enable');
await cdp('Runtime.enable');
await cdp('Emulation.setDeviceMetricsOverride', {
	width,
	height: 900,
	deviceScaleFactor: 1,
	mobile: width < 600
});

loaded = new Promise((resolve) => (loadResolve = resolve));
await cdp('Page.navigate', { url });
await Promise.race([loaded, sleep(15000)]);
await sleep(1800);

const report = await cdp('Runtime.evaluate', {
	expression: `(() => {
		const box = (el) => {
			if (!el) return null;
			const b = el.getBoundingClientRect();
			return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
		};
		const bodyText = document.body.innerText.slice(0, 400);
		return {
			url: location.href,
			title: document.title,
			errorPage: /^\s*500\b/.test(bodyText) && /Internal Error/.test(bodyText),
			bodyText,
			viewport: { width: innerWidth, height: innerHeight },
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth,
			h1: box(document.querySelector('h1')),
			sections: [...document.querySelectorAll('main > section, body > section')].map((s) => ({
				id: s.id || s.getAttribute('aria-labelledby') || null,
				...box(s)
			}))
		};
	})()`,
	returnByValue: true
});
const value = report.result.value;

let expression;
if (expressionArg) {
	const source = readFileSync(expressionArg, 'utf8');
	const result = await cdp('Runtime.evaluate', { expression: source, returnByValue: true });
	expression = result.result.value ?? result.result.description;
}

const metrics = await cdp('Page.getLayoutMetrics');
const height = Math.ceil(metrics.cssContentSize.height);
const shot = await cdp('Page.captureScreenshot', {
	format: 'png',
	captureBeyondViewport: true,
	clip: { x: 0, y: 0, width, height, scale: 1 }
});
writeFileSync(out, Buffer.from(shot.data, 'base64'));

const problems = [];
if (value.errorPage) problems.push('the framework rendered its error page');
if (value.scrollWidth > value.clientWidth)
	problems.push(`horizontal overflow: ${value.scrollWidth} > ${value.clientWidth}`);
problems.push(...consoleErrors.map((error) => `console error: ${error}`));
problems.push(...exceptions.map((error) => `exception: ${error}`));

console.log(
	JSON.stringify(
		{ ...value, expression, screenshot: out, height, consoleErrors, exceptions },
		null,
		2
	)
);

ws.close();
chrome.kill();

if (problems.length) {
	console.error('\nrender check failed:');
	for (const problem of problems) console.error(`- ${problem}`);
	process.exit(1);
}
console.log('\nrender check passed');
process.exit(0);
