// Serve a static build and screenshot pages in Chromium.
//
//   SITE_ROOT=$HOME/work/site/build OUT=$HOME/work/shots \
//   PAGES=/mama/brainstorm/,/mama/ WIDTHS=1440x1000,430x900 \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/playwright node shoot-page.cjs
//
// PAGES are paths on the served site. Each WIDTHxHEIGHT writes <slug>-<width>.png,
// where the slug is the path with its slashes turned into dashes.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const root = path.resolve(process.env.SITE_ROOT || "build");
const out = path.resolve(process.env.OUT || "shots");
const pages = (process.env.PAGES || "/").split(",").filter(Boolean);
const sizes = (process.env.WIDTHS || "1440x1000,430x900")
  .split(",")
  .map((size) => size.split("x").map(Number));

const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};

const server = http.createServer((req, res) => {
  let file = decodeURIComponent(req.url.split("?")[0]);
  if (file.endsWith("/")) file += "index.html";
  const full = path.join(root, file);
  if (
    !full.startsWith(root) ||
    !fs.existsSync(full) ||
    fs.statSync(full).isDirectory()
  ) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, {
    "content-type": types[path.extname(full)] ?? "application/octet-stream",
  });
  fs.createReadStream(full).pipe(res);
});

server.listen(0, "127.0.0.1", async () => {
  const port = server.address().port;
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });

  for (const routePath of pages) {
    const slug =
      routePath.replace(/^\/+|\/+$/g, "").replaceAll("/", "-") || "home";
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await page.goto(`http://127.0.0.1:${port}${routePath}`, {
        waitUntil: "networkidle",
      });
      const file = path.join(out, `${slug}-${width}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(file, await page.title());
    }
  }

  await browser.close();
  server.close();
});
