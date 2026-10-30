// Is the whole row / card clickable? Hit-test the target instead of trusting the CSS.
//
//   node scripts/link-coverage.mjs <url> <row-selector> [width] [height]
//
// Start the browser first (see SKILL.md); the port comes from CDP_PORT (default 9222). For every
// match of the row selector it prints the row box, the anchor count, the anchor box, whether the
// two boxes are equal, and whether elementFromPoint at the four corners and the centre lands in
// the anchor. Each row is scrolled into view first: elementFromPoint answers null for a point
// outside the viewport, which reads as "not clickable" when the truth is "not on screen".
const PORT = Number(process.env.CDP_PORT ?? 9222);
const W = Number(process.argv[4] ?? 390);
const H = Number(process.argv[5] ?? 844);
const ROW_SELECTOR = process.argv[3];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newTarget(url) {
	const res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, {
		method: 'PUT'
	});
	if (!res.ok) throw new Error(`json/new → HTTP ${res.status} — is the browser running?`);
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

const expression = `(() => {
  const num = (n) => Math.round(n * 100) / 100;
  const rows = [...document.querySelectorAll(${JSON.stringify(ROW_SELECTOR)})];
  return JSON.stringify({
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    rows: rows.map((row) => {
      row.scrollIntoView({ block: 'center' });
      const anchors = row.querySelectorAll('a');
      const link = anchors[0];
      if (!link) return { anchorsInRow: 0 };
      const r = row.getBoundingClientRect();
      const l = link.getBoundingClientRect();
      const probes = [
        [r.left + 2, r.top + 2],
        [r.left + 2, r.bottom - 2],
        [r.right - 2, r.bottom - 2],
        [r.left + r.width / 2, r.top + r.height / 2]
      ];
      const label = row.querySelector('h1,h2,h3,.name');
      return {
        name: (label ?? row).textContent.trim().slice(0, 40),
        anchorsInRow: anchors.length,
        href: link.getAttribute('href'),
        accessibleName: link.getAttribute('aria-label') ?? link.textContent.trim(),
        rowBox: [num(r.x), num(r.y), num(r.width), num(r.height)],
        linkBox: [num(l.x), num(l.y), num(l.width), num(l.height)],
        coversRow: Math.abs(r.x - l.x) < 0.5 && Math.abs(r.y - l.y) < 0.5 && Math.abs(r.width - l.width) < 0.5 && Math.abs(r.height - l.height) < 0.5,
        probesHitLink: probes.map(([x, y]) => { const el = document.elementFromPoint(x, y); return !!el && (el === link || link.contains(el)); }),
        cursor: getComputedStyle(link).cursor
      };
    })
  });
})()`;

const run = async () => {
	const url = process.argv[2];
	if (!url || !ROW_SELECTOR) {
		console.error('usage: node link-coverage.mjs <url> <row-selector> [width] [height]');
		process.exit(2);
	}
	const target = await newTarget('about:blank');
	const cdp = client(target.webSocketDebuggerUrl);
	await cdp.ready;
	await cdp.send('Page.enable');
	await cdp.send('Runtime.enable');
	await cdp.send('Emulation.setDeviceMetricsOverride', {
		width: W,
		height: H,
		deviceScaleFactor: 1,
		mobile: W < 600
	});
	await cdp.send('Page.navigate', { url });
	for (let i = 0; i < 80 && !cdp.events.includes('Page.loadEventFired'); i++) await sleep(100);
	await sleep(400);
	const res = await cdp.send('Runtime.evaluate', { expression, returnByValue: true });
	const value = res.result?.result?.value;
	console.log(value ? JSON.stringify(JSON.parse(value), null, 2) : JSON.stringify(res.result ?? res));
	cdp.close();
};

run().catch((err) => {
	console.error(`FAILED: ${err.message}`);
	process.exit(1);
});
