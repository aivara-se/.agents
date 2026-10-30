// Serve a SvelteKit adapter-static build the way a static host does — for a review
// tunnel or after any build. Pages semantics, not vite's: an extensionless path
// resolves to that directory's index.html, whatever its depth.
// Usage: bun serve-build.ts [ROOT=build] [PORT=8788]
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

const ROOT = resolve(process.argv[2] ?? 'build');
const PORT = Number(process.argv[3] ?? 8788);

const types: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.woff2': 'font/woff2',
	'.txt': 'text/plain; charset=utf-8'
};

function fileFor(pathname: string): string | null {
	let p = pathname;
	if (p === '/') p = '/index.html';
	if (!extname(p)) p = `${p.replace(/\/$/, '')}/index.html`;
	const full = join(ROOT, p);
	if (!full.startsWith(ROOT)) return null;
	if (existsSync(full) && statSync(full).isFile()) return full;
	return null;
}

Bun.serve({
	port: PORT,
	fetch(request) {
		const file = fileFor(new URL(request.url).pathname);
		if (!file) return new Response('not found', { status: 404 });
		const type = types[extname(file)] ?? 'application/octet-stream';
		return new Response(readFileSync(file), { headers: { 'content-type': type } });
	}
});

console.log(`serving ${ROOT} on :${PORT}`);