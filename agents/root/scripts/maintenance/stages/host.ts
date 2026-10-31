/** Stage 1: the host itself — packages, temp files, journal, logs, disk. */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "../context";
import { diskFreeGiB, human, olderThan } from "../fsx";
import { act, info, ok, plan, say, warn } from "../report";
import { lines, run } from "../shell";

export function host(ctx: Ctx) {
  const { cfg: CFG, dry } = ctx;
  say("");
  say("1. HOST");

  if (dry) plan("apt-get update -qq (refresh the package lists)");
  else run(["apt-get", "update", "-qq", "-o", "Acquire::http::Timeout=20", "-o", "DPkg::Lock::Timeout=120"], { timeout: 300_000 });

  const pending = lines(run(["apt-get", "-s", "upgrade"]).out).filter((line) => line.startsWith("Inst")).length;
  info(`apt: ${pending} package upgrade(s) available — the agent gates the upgrade on live turns`);

  if (existsSync("/var/run/reboot-required")) {
    const pkgs = existsSync("/var/run/reboot-required.pkgs")
      ? readFileSync("/var/run/reboot-required.pkgs", "utf8").trim().split("\n").join(" ")
      : "";
    warn(`reboot required (${pkgs || "no package list"})`);
  } else ok("no reboot required");

  // Temp files are regenerable by definition: a week in /tmp, a month in /var/tmp.
  for (const [dir, days] of [["/tmp", 7], ["/var/tmp", 30]] as const) {
    const stale = olderThan(dir, days);
    if (stale.length === 0) {
      ok(`temp: nothing past ${days}d in ${dir}`);
      continue;
    }
    if (dry) {
      plan(`temp: would remove ${stale.length} file(s) older than ${days}d from ${dir}`);
      continue;
    }
    for (const path of stale) rmSync(path, { force: true });
    act(`temp: removed ${stale.length} file(s) older than ${days}d from ${dir}`);
  }

  const before = run(["journalctl", "--disk-usage"]);
  const beforeSize = before.out.trim() || "unknown";
  if (dry) {
    plan(`journal: would vacuum to 14d (now ${beforeSize})`);
  } else {
    run(["journalctl", "--vacuum-time=14d"], { timeout: 180_000 });
    const afterSize = run(["journalctl", "--disk-usage"]).out.trim() || "unknown";
    if (afterSize !== beforeSize) act(`journal: vacuumed to 14d (${beforeSize} -> ${afterSize})`);
    else ok(`journal: ${afterSize} already within the 14d cap`);
  }

  const systemd = run(["systemctl", "is-system-running"]).out.trim();
  if (/^(running|degraded)/.test(systemd)) ok(`systemd: ${systemd}`);
  else warn(`systemd not settling: ${systemd || "no answer"}`);

  // logrotate owns the policy; this clears only what it no longer reaches.
  const rotated = lines(run(["/usr/bin/find", "/var/log", "-xdev", "-type", "f", "(", "-name", "*.gz", "-o", "-name", "*.[0-9]", ")", "-mtime", "+30"]).out);
  if (rotated.length === 0) ok("rotated logs: nothing older than 30d");
  else if (dry) plan(`rotated logs: would remove ${rotated.length} file(s) older than 30d`);
  else {
    for (const path of rotated) rmSync(path, { force: true });
    act(`rotated logs: removed ${rotated.length} file(s) older than 30d`);
  }

  // The backup store is the fleet stage's to retain. Loose archives here are the
  // only copy of a past host: report their age, never delete them. A dry run
  // creates nothing, so a probe against a clean host leaves no trace.
  if (!dry && !existsSync(CFG.backups)) mkdirSync(CFG.backups, { recursive: true, mode: 0o700 });
  const entries = existsSync(CFG.backups) ? readdirSync(CFG.backups) : [];
  info(`backup store ${CFG.backups}: ${human(entries.length ? entries.reduce((sum, name) => sum + statSync(join(CFG.backups, name)).size, 0) : 0)} in ${entries.length} entr(y/ies)`);
  for (const name of entries) {
    if (!/\.(zip|tar\.zst)$/.test(name)) continue;
    const path = join(CFG.backups, name);
    const ageDays = Math.floor((Date.now() - statSync(path).mtimeMs) / 86_400_000);
    if (ageDays > 30) info(`aged archive: ${name} ${human(statSync(path).size)}, ${ageDays}d old (kept — report only)`);
  }

  const free = diskFreeGiB();
  if (free < 5) warn(`host disk: only ${free.toFixed(0)} GiB free`);
  else if (free < 12) warn(`host disk: ${free.toFixed(0)} GiB free (getting tight)`);
  else ok(`host disk: ${free.toFixed(0)} GiB free`);

  const load = readFileSync("/proc/loadavg", "utf8").split(" ").slice(0, 3).join(" ");
  const uptime = run(["uptime", "-p"]).out.trim().replace(/^up /, "");
  info(`load: ${load}; up ${uptime || "unknown"}`);
}
