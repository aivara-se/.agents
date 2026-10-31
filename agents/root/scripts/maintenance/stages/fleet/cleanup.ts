/** The only repairs: start a stopped container, prune what is regenerable, drop a
 *  stale marker. Nothing an agent wrote is touched here. */
import { copyFileSync, existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { Ctx } from "../../context";
import { olderThan } from "../../fsx";
import { homeOf, installDir, profileDir, profiles } from "../../profile";
import { act, info, ok, plan, warn } from "../../report";
import { lines, run } from "../../shell";

export function cleanup(ctx: Ctx) {
  const { cfg: CFG, dry } = ctx;
  // Stopped containers we expect to be up.
  for (const id of lines(run(["docker", "ps", "-aq", "--filter", "label=hermes-agent=1"]).out)) {
    const status = run(["docker", "inspect", "-f", "{{.State.Status}}", id]).out.trim();
    if (status !== "exited" && status !== "created") continue;
    if (dry) {
      plan(`container ${id} is ${status} — would start it`);
      continue;
    }
    if (run(["docker", "start", id]).code === 0) act(`${run(["docker", "inspect", "-f", "{{.Name}}", id]).out.trim().replace(/^\//, "")} was ${status} — started`);
  }

  if (dry) {
    plan("docker: would prune dangling images and build cache older than 7d");
  } else {
    run(["docker", "image", "prune", "-f"], { timeout: 300_000 });
    run(["docker", "builder", "prune", "-f", "--filter", "until=168h"], { timeout: 300_000 });
    act("docker: pruned dangling images and build cache older than 7d");
  }

  // Regenerable caches: terminal output >14d, fetched pages >30d, cron output >30d.
  const caches: Array<[string, number]> = [
    [join(CFG.home, "cache", "terminal-output"), 14],
    [join(CFG.home, "cache", "web"), 30],
  ];
  for (const profile of profiles()) caches.push([join(profileDir(profile), "cron", "output"), 30]);
  const removed: string[] = [];
  for (const [dir, days] of caches) {
    const stale = olderThan(dir, days);
    if (stale.length === 0) continue;
    if (dry) {
      plan(`caches: would remove ${stale.length} file(s) older than ${days}d from ${dir}`);
      continue;
    }
    for (const path of stale) rmSync(path, { force: true });
    removed.push(`${stale.length} in ${basename(dirname(dir))}/${basename(dir)}`);
  }
  if (removed.length) act(`caches: removed ${removed.join(", ")}`);
  else ok("caches: nothing older than threshold");

  // A stale restart marker makes every CLI call claim the gateways were not restarted.
  const marker = join(CFG.home, "fleet_restart_pending");
  if (existsSync(marker)) {
    const body = readFileSync(marker, "utf8");
    const expected = body.match(/expected_sha"?[=: ]*"?([a-f0-9]{7,})/)?.[1];
    const pid = Number(body.match(/(?:^|[^a-z])pid"?[=: ]*"?(\d+)/)?.[1] ?? 0);
    const head = run(["git", "-C", installDir(), "rev-parse", "HEAD"]).out.trim();
    const pidGone = pid === 0 || run(["/bin/kill", "-0", String(pid)]).code !== 0;
    if (expected && head && head === expected && pidGone) {
      if (dry) plan(`restart marker: would remove it (HEAD matches, pid ${pid || "none"} is gone)`);
      else {
        const backup = `${marker}.removed-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.bak`;
        copyFileSync(marker, backup);
        rmSync(marker, { force: true });
        act(`removed stale restart marker (HEAD matches, requesting pid ${pid || "none"} is gone; copy kept as ${basename(backup)})`);
      }
    } else info("restart marker present and not provably stale — left in place");
  }

  // Sandbox home growth: report only, never delete agent work.
  for (const profile of profiles().filter((name) => name !== "default")) {
    const home = homeOf(profile);
    if (!home) continue;
    const size = Number(run(["du", "-sm", home]).out.split(/\s+/)[0] ?? 0);
    info(`${profile} sandbox home: ${size} MiB`);
    if (size > 6000) warn(`${profile} sandbox home above 6 GiB — consider pruning caches/build dirs`);
  }
}
