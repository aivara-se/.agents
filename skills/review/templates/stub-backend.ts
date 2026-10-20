#!/usr/bin/env bun
/**
 * A stub backend whose writes reach its reads.
 *
 * Copy, then change: the read route, the write route, the state's fields, the JSON
 * shape the change expects, and the auth header if the change does not use a bearer
 * token. Run it from the home directory (a sandbox /tmp is often noexec), on its own
 * port, with the artifact pointed at it:
 *
 *   STUB_WRITES=./writes.log STUB_STATE='[{"key":"a","value":1}]' \
 *     bun run stub-backend.ts 8080
 */

import { appendFileSync } from "node:fs";

/** One item the stub holds: the key the write route addresses, and whatever else the read serves. */
interface Item {
  key: string | number;
  [field: string]: unknown;
}

const token = process.env.STUB_TOKEN ?? "stub-token";
const writes = process.env.STUB_WRITES;
const state = process.env.STUB_STATE;

if (!writes || !state) {
  console.error("usage: STUB_WRITES=<log path> STUB_STATE='<JSON array>' bun run stub-backend.ts <port>");
  process.exit(2);
}

const port = Number(Bun.argv[2]);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`stub-backend needs a port as its argument, not ${Bun.argv[2] ?? "nothing"}`);
  process.exit(2);
}

/** The mutable state the write route changes and the read route serves. */
const items: Item[] = JSON.parse(state);

/** The state as the change's read expects it. Change this shape. */
function snapshot(): Item[] {
  return [...items].sort((left, right) => String(left.key).localeCompare(String(right.key)));
}

/**
 * Appends one write to the log with an epoch timestamp, so the probe can read the order
 * and the count of the writes the artifact made rather than trusting its own summary.
 */
function record(path: string, payload: unknown): void {
  appendFileSync(writes as string, `${(Date.now() / 1000).toFixed(6)} PATCH ${path} ${JSON.stringify(payload)}\n`);
}

/** The body a write carries, or an empty object where it carries none. */
async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await request.json();
    return parsed !== null && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

Bun.serve({
  hostname: "127.0.0.1",
  port,
  fetch(request: Request): Response | Promise<Response> {
    if (request.headers.get("authorization") !== `Bearer ${token}`) {
      return new Response(null, { status: 401 });
    }
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/read") {
      return Response.json(snapshot());
    }

    if (request.method === "PATCH") {
      return (async () => {
        const payload = await body(request);
        const key = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
        for (const item of items) {
          if (String(item.key) === key) Object.assign(item, payload);
        }
        record(url.pathname, payload);
        return Response.json(payload);
      })();
    }

    return new Response(null, { status: 404 });
  },
  error(error: Error): Response {
    console.error(`stub-backend: ${error.message}`);
    return new Response("stub backend failed", { status: 500 });
  },
});

console.log(`stub-backend listening on 127.0.0.1:${port}, ${items.length} items, writes to ${writes}`);
