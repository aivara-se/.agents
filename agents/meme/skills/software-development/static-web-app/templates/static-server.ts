// Serves this directory for local use. Copy to scripts/serve.ts and adapt.
// Run: bun run scripts/serve.ts
import { join, extname } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".wav": "audio/wav",
};
const port = Number(process.env.PORT ?? 8787);

Bun.serve({
  port,
  async fetch(request) {
    // Map the root first, then take the type from that final path, or "/" ships as octet-stream.
    let path = new URL(request.url).pathname;
    if (path === "/") path = "/index.html";
    const file = Bun.file(join(ROOT, path));
    if (!(await file.exists())) return new Response("not found", { status: 404 });
    return new Response(file, { headers: { "content-type": TYPES[extname(path)] ?? "application/octet-stream" } });
  },
});

console.log(`serving on http://localhost:${port}`);
