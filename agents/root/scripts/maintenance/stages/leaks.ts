/** Stage 4: report only. Nothing here writes, kills or restarts — a process may be
 *  a bot's own work, so the pass hands the evidence over instead of acting on it. */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import type { Ctx } from "../context";
import { profileDir, profiles } from "../profile";
import { info, ok, say, warn } from "../report";
import { lines, run } from "../shell";

function tailLines(path: string, bytes = 4 * 1024 * 1024): string[] {
  try {
    const size = statSync(path).size;
    const handle = readFileSync(path);
    const slice = size > bytes ? handle.subarray(size - bytes) : handle;
    return slice.toString("utf8").split("\n").slice(1);
  } catch {
    return [];
  }
}

const NOISE = [
  "docker-init", "sleep infinity", "speech-dispatcher", "dbus-daemon", "sshd", "Xvfb",
  "ps -eo", "sh -c ps", "sleep ", "agetty", "runsv", "cron", "dockerd", "containerd",
];

export function leaks(ctx: Ctx) {
  const { cfg: CFG } = ctx;
  const now = Date.now() / 1000;

  // 1. Watch-notification spins: a chat whose session ended, re-injected every tick.
  for (const profile of profiles()) {
    const log = join(profileDir(profile), "logs", "gateway.log");
    if (!existsSync(log)) continue;
    const perChat = new Map<string, number[]>();
    for (const line of tailLines(log)) {
      const match = line.match(/^(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d),\d+ .*Watch pattern notification.*chat=(\S+?)(?:\s|$)/);
      if (!match) continue;
      const stamp = Date.parse(match[1].replace(" ", "T") + "Z") / 1000;
      if (!Number.isFinite(stamp) || now - stamp > 3600) continue;
      const list = perChat.get(match[2]) ?? [];
      list.push(stamp);
      perChat.set(match[2], list);
    }
    if (perChat.size === 0) continue;

    const live = new Map<string, boolean>();
    const db = join(profileDir(profile), "state.db");
    if (existsSync(db)) {
      try {
        const conn = new Database(db, { readonly: true });
        for (const row of conn.query("select chat_id, ended_at from sessions where chat_id is not null and chat_id != ''").all() as Array<{ chat_id: string; ended_at: number | null }>) {
          live.set(row.chat_id, (live.get(row.chat_id) ?? false) || row.ended_at === null);
        }
        conn.close();
      } catch {
        // An unreadable session store is not evidence of a spin.
      }
    }
    for (const [chat, stamps] of [...perChat.entries()].sort((a, b) => b[1].length - a[1].length)) {
      const ended = !(live.get(chat) ?? true);
      const span = Math.max(1, Math.floor((stamps[stamps.length - 1] - stamps[0]) / 60));
      if (stamps.length >= 30 && ended) warn(`${profile}: watch spin — ${stamps.length} injections in ${span} min for chat ${chat} whose session ended; only a gateway restart clears it`);
      else if (stamps.length >= 30) info(`${profile}: ${stamps.length} watch injections in the last hour for live chat ${chat} (normal)`);
      else ok(`${profile}: watch injections last hour for chat ${chat}: ${stamps.length}`);
    }
  }

  // 2. Orphaned sandbox processes: grouped by command shape, never one line each.
  for (const line of lines(run(["docker", "ps", "--format", '{{.ID}} {{.Label "hermes-profile"}}']).out)) {
    const [id, label] = line.split(/\s+/, 2);
    const profile = label ? label.split("-")[0] : id;
    const listing = run(["docker", "exec", id, "ps", "-eo", "pid,etimes,args", "--sort=-etimes"]).out;
    if (!listing.trim()) continue;
    const groups = new Map<string, { n: number; max: number; pid: string }>();
    for (const row of listing.split("\n").slice(1)) {
      const bits = row.trim().split(/\s+/, 3);
      if (bits.length < 3) continue;
      const [pid, etimes, args] = bits;
      if (pid === "1" || !/^\d+$/.test(etimes) || Number(etimes) < CFG.staleTurnSeconds) continue;
      if (NOISE.some((needle) => args.includes(needle))) continue;
      const key = args.trim().split(/\s+/).slice(0, 2).join(" ").slice(0, 60);
      const group = groups.get(key) ?? { n: 0, max: 0, pid };
      group.n += 1;
      group.max = Math.max(group.max, Number(etimes));
      groups.set(key, group);
    }
    if (groups.size === 0) {
      ok(`${profile}: no sandbox process older than ${CFG.staleTurnSeconds / 3600}h`);
      continue;
    }
    for (const [key, group] of [...groups.entries()].sort((a, b) => b[1].max - a[1].max)) {
      warn(`${profile}: ${group.n} process(es) '${key}' older than ${Math.floor(group.max / 3600)}h (oldest pid ${group.pid}) — report only, a container restart clears them`);
    }
  }

  // 3. Dead registry pids are cruft, never a fault.
  for (const profile of profiles()) {
    const path = join(profileDir(profile), "processes.json");
    if (!existsSync(path)) continue;
    try {
      const entries = JSON.parse(readFileSync(path, "utf8")) ?? [];
      if (!Array.isArray(entries) || entries.length === 0) {
        ok(`${profile}: no registry rows`);
        continue;
      }
      const dead = entries.filter((entry: { pid?: number }) => {
        if (!entry?.pid) return false;
        return run(["/bin/kill", "-0", String(entry.pid)]).code !== 0;
      }).length;
      if (dead > 0) info(`${profile}: ${dead} of ${entries.length} registry row(s) point at dead pids (cruft)`);
      else ok(`${profile}: all ${entries.length} registry row(s) alive`);
    } catch (error) {
      info(`${profile}: processes.json unreadable (${error})`);
    }
  }

  // 4. A single log above 20 MB is a leak or a missing rotation.
  for (const profile of profiles()) {
    const dir = join(profileDir(profile), "logs");
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter((file) => file.endsWith(".log"))) {
      const size = statSync(join(dir, name)).size;
      if (size > 20 * 1024 * 1024) warn(`${profile}: ${name} is ${Math.floor(size / 1_048_576)} MB (> 20 MB) — leak or missing rotation`);
    }
  }
}

/** Printed by the step so the log numbers its four stages once. */
export const leaksHeading = "4. LEAKS";
