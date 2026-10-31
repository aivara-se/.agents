#!/usr/bin/env bun
/**
 * Daily maintenance for this host and the Hermes fleet — the deterministic half
 * of `agents/root/maintenance.md`. It inspects, repairs what is reversible,
 * archives what is not reproducible, and prints one log. The agent that reads
 * the log takes the judgement calls: conflicts, the upgrade, stale skill prose.
 *
 * Run:
 *   bun run scripts/maintenance.ts                     # every stage, real pass
 *   bun run scripts/maintenance.ts --dry-run           # plan, change nothing
 *   bun run scripts/maintenance.ts --only=leaks        # one stage
 *   bun run scripts/maintenance.ts --upgrade           # gated apt upgrade
 *
 * Exit: 0 clean, 2 conflict (nothing left half-done), 1 hard error.
 *
 * Paths are configuration, never constants: a rebuilt host maps its own layout
 * through the environment without editing this file. Nothing here prints a
 * secret value — presence, length and mode only.
 */
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

// ---------------------------------------------------------------- config

export const CFG = {
  home: process.env.HERMES_HOME ?? join(homedir(), ".hermes"),
  backups: process.env.HERMES_BACKUP_DIR ?? join(homedir(), "backups", "hermes"),
  repo: process.env.AGENTS_REPO ?? join(homedir(), "github", "aivara-se", ".agents"),
  stock: process.env.MAINT_STOCK ?? join(process.env.HERMES_HOME ?? join(homedir(), ".hermes"), "hermes-agent", "skills"),
  log: process.env.MAINT_LOG ?? join("/var", "log", "maintenance.log"),
  branch: "next",
  keep: Number(process.env.MAINT_KEEP ?? "8"),
  dashboard: process.env.MAINT_DASHBOARD_URL ?? "",
  tunnelReady: process.env.MAINT_TUNNEL_READY ?? "http://127.0.0.1:20241/ready",
  probePublicIp: process.env.MAINT_PUBLIC_IP_PROBE === "1",
  staleTurnSeconds: 6 * 3600,
};

const STAGES = ["host", "fleet", "sync", "leaks"] as const;
type Stage = (typeof STAGES)[number];

// ---------------------------------------------------------------- log

const LINES: string[] = [];
const WARNS: string[] = [];
const ACTS: string[] = [];

const say = (line = "") => LINES.push(line);
const ok = (msg: string) => LINES.push(`  [ok]   ${msg}`);
const info = (msg: string) => LINES.push(`  · ${msg}`);
const warn = (msg: string) => {
  WARNS.push(msg);
  LINES.push(`  [WARN] ${msg}`);
};
const act = (msg: string) => {
  ACTS.push(msg);
  LINES.push(`  [act]  ${msg}`);
};
const plan = (msg: string) => LINES.push(`  [plan] ${msg}`);

// ---------------------------------------------------------------- shell

type Res = { code: number; out: string; err: string };

function run(cmd: string[], opts: { cwd?: string; timeout?: number } = {}): Res {
  try {
    const proc = Bun.spawnSync(cmd, {
      cwd: opts.cwd,
      stdout: "pipe",
      stderr: "pipe",
      timeout: opts.timeout ?? 120_000,
      env: process.env,
    });
    return {
      code: proc.exitCode ?? 1,
      out: proc.stdout ? new TextDecoder().decode(proc.stdout) : "",
      err: proc.stderr ? new TextDecoder().decode(proc.stderr) : "",
    };
  } catch (error) {
    return { code: 1, out: "", err: String(error) };
  }
}

const lines = (text: string) => text.split("\n").filter((line) => line.length > 0);
const which = (bin: string) => run(["/usr/bin/env", "sh", "-c", `command -v ${bin}`]).code === 0;

// ---------------------------------------------------------------- profiles

export function profiles(home = CFG.home): string[] {
  const found = ["default"];
  const dir = join(home, "profiles");
  if (!existsSync(dir)) return found;
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    // A dot-directory is a retired profile's leftover, not an agent: the shell
    // glob never matched one, and neither should this.
    if (entry.isDirectory() && !entry.name.startsWith(".")) found.push(entry.name);
  }
  return found;
}

const profileDir = (profile: string, home = CFG.home) =>
  profile === "default" ? home : join(home, "profiles", profile);

/** The bind-mounted sandbox home: `shared_<profile>-<hash>/home`. A broad glob also matches probe leftovers. */
export function homeOf(profile: string, home = CFG.home): string | null {
  const docker = join(home, "profiles", profile, "sandboxes", "docker");
  if (!existsSync(docker)) return null;
  const match = readdirSync(docker).find((name) => name.startsWith(`shared_${profile}-`));
  return match ? join(docker, match, "home") : null;
}

/** Turn leases that have not expired — the one signal that a turn is live in a profile.
 *  `null` means the store could not be read: an unreadable store is never evidence of
 *  idleness, so every caller treats it as a live turn. */
export function leaseCount(profile: string, home = CFG.home): number | null {
  const db = join(profileDir(profile, home), "state.db");
  if (!existsSync(db)) return 0;
  try {
    const conn = new Database(db, { readonly: true });
    const row = conn.query("select count(*) as n from session_turn_leases where expires_at is not null and expires_at > ?").get(Math.floor(Date.now() / 1000)) as { n: number } | null;
    conn.close();
    return row?.n ?? 0;
  } catch {
    return null;
  }
}

const liveTurns = () => profiles().reduce((sum, profile) => sum + (leaseCount(profile) ?? 1), 0);

// ---------------------------------------------------------------- filesystem help

const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

function walk(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out.sort();
}

const olderThan = (dir: string, days: number): string[] => {
  const cutoff = Date.now() - days * 86_400_000;
  return walk(dir).filter((path) => {
    try {
      return statSync(path).mtimeMs < cutoff;
    } catch {
      return false;
    }
  });
};

const human = (bytes: number) => {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
};

const diskFreeGiB = () => {
  const r = run(["df", "-P", "/"]);
  const row = lines(r.out)[1]?.split(/\s+/);
  return row ? Number(row[3]) / 1_048_576 : 0;
};

// ---------------------------------------------------------------- 1. host

function stageHost(dry: boolean) {
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

// ---------------------------------------------------------------- 2. fleet: backups

const STATE_EXCLUDES = [
  "./profiles", "./cache", "./sandboxes", "./node", "./tools", "./installs", "./bin",
  "./state-snapshots", "./models_dev_cache.json", "./image_cache", "./audio_cache",
  "./logs", "./cron/output", "./*.log", "./*.lock", "./*.sock", "./node_modules",
];

const IDENTITY_EXCLUDES = [
  "./github", "./node26", "./node26.bak-*", "./go-sdk", "./go-sdk.bak-*", "./gh-cli",
  "./chrome", "./playwright*", "./.local/share/ms-playwright", "./.bun", "./.npm",
  "./.gradle", "./.cache", "./.cargo", "./.commandcode/worktrees", "./worktrees",
  "./.yarn", "./.hermes/kanban", "./.rustup", "./scratch", "./tmp", "./node_modules",
  "./*.log", "./*.tmp",
];

function archive(src: string, dest: string, excludes: string[]): { bytes: number; members: string[] } | null {
  mkdirSync(dirname(dest), { recursive: true });
  const tar = run(
    ["tar", "-C", src, ...excludes.map((pattern) => `--exclude=${pattern}`), "-I", "zstd -3 -T0 -q", "-cf", dest, "."],
    { timeout: 900_000 },
  );
  if (tar.code !== 0 || !existsSync(dest) || statSync(dest).size === 0) return null;
  chmodSync(dest, 0o600);
  const members = lines(run(["tar", "-tf", dest], { timeout: 300_000 }).out);
  return { bytes: statSync(dest).size, members };
}

function backupStage(dry: boolean) {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  if (!dry) mkdirSync(CFG.backups, { recursive: true, mode: 0o700 });

  for (const profile of profiles()) {
    const src = profileDir(profile);
    if (!existsSync(src)) {
      warn(`${profile}: profile dir missing (${src})`);
      continue;
    }
    const dest = join(CFG.backups, `state-${profile}-${stamp}.tar.zst`);
    if (dry) {
      plan(`state: would archive ${src} -> ${basename(dest)}`);
      continue;
    }
    const made = archive(src, dest, STATE_EXCLUDES);
    if (made) ok(`${profile} state: ${human(made.bytes)} (${made.members.length} entries)`);
    else warn(`${profile}: state backup FAILED`);
  }

  for (const profile of profiles().filter((name) => name !== "default")) {
    const home = homeOf(profile);
    if (!home) {
      warn(`${profile}: sandbox home not found — no identity archive`);
      continue;
    }
    const dest = join(CFG.backups, `identity-${profile}-${stamp}.tar.zst`);
    if (dry) {
      plan(`identity: would archive ${home} -> ${basename(dest)}`);
      continue;
    }
    const made = archive(home, dest, IDENTITY_EXCLUDES);
    // A non-empty tarball is not a backup: an empty directory skeleton passes -s too.
    if (!made) warn(`${profile}: sandbox backup FAILED`);
    else if (!made.members.some((member) => member.startsWith("./.secrets/")))
      warn(`${profile}: identity archive carries no .secrets — wrong home? (${dest})`);
    else ok(`${profile} sandbox identity: ${human(made.bytes)} (${made.members.length} entries, .secrets present)`);
  }

  const archives = existsSync(CFG.backups) ? readdirSync(CFG.backups) : [];
  for (const type of ["state", "identity", "sandbox"]) {
    const held = archives
      .filter((name) => name.startsWith(`${type}-`) && name.endsWith(".tar.zst"))
      .map((name) => ({ name, mtime: statSync(join(CFG.backups, name)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime);
    const stale = held.slice(CFG.keep);
    if (stale.length === 0) continue;
    if (dry) plan(`retention: would remove ${stale.length} old ${type} archive(s) beyond ${CFG.keep}`);
    else {
      for (const entry of stale) rmSync(join(CFG.backups, entry.name), { force: true });
      act(`retention: removed ${stale.length} old ${type} archive(s) beyond ${CFG.keep}`);
    }
  }

  info(
    `archives held: state=${archives.filter((n) => n.startsWith("state-")).length} ` +
      `identity=${archives.filter((n) => n.startsWith("identity-")).length} ` +
      `sandbox=${archives.filter((n) => n.startsWith("sandbox-")).length}`,
  );

  // Unpushed work is the one thing a tarball does not protect.
  for (const profile of profiles()) {
    const home = profile === "default" ? CFG.home : homeOf(profile);
    if (!home || !existsSync(join(home, "github"))) continue;
    for (const owner of readdirSync(join(home, "github"), { withFileTypes: true })) {
      if (!owner.isDirectory()) continue;
      const ownerDir = join(home, "github", owner.name);
      for (const entry of readdirSync(ownerDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const repo = join(ownerDir, entry.name);
        if (!existsSync(join(repo, ".git"))) continue;
        const dirty = lines(run(["git", "-C", repo, "status", "--porcelain"]).out).length;
        const unpushed = lines(run(["git", "-C", repo, "log", "--branches", "--not", "--remotes", "--oneline"]).out).length;
        if (dirty > 0) warn(`${profile} ${entry.name}: ${dirty} uncommitted file(s)`);
        if (unpushed > 0) warn(`${profile} ${entry.name}: ${unpushed} unpushed commit(s)`);
      }
    }
  }
}

// ---------------------------------------------------------------- 2. fleet: health

function containerFor(profile: string, home: string | null): string | null {
  const listed = lines(run(["docker", "ps", "-a", "--format", "{{.ID}} {{.Label \"hermes-profile\"}}"]).out);
  for (const line of listed) {
    const [id, label] = line.split(/\s+/, 2);
    if (label && label.startsWith(`${profile}-`)) return id;
  }
  if (!home) return null;
  for (const id of lines(run(["docker", "ps", "-aq"]).out)) {
    const mount = run(["docker", "inspect", "-f", '{{range .Mounts}}{{if eq .Destination "/root"}}{{.Source}}{{end}}{{end}}', id]).out.trim();
    if (mount === home) return id;
  }
  return null;
}

function healthStage(dry: boolean) {
  const free = diskFreeGiB();
  if (free < 5) warn(`host disk: only ${free.toFixed(0)} GiB free`);
  else if (free < 12) warn(`host disk: ${free.toFixed(0)} GiB free (getting tight)`);
  else ok(`host disk: ${free.toFixed(0)} GiB free`);

  const meminfo = readFileSync("/proc/meminfo", "utf8");
  const grab = (key: string) => Number(meminfo.match(new RegExp(`^${key}:\\s+(\\d+)`, "m"))?.[1] ?? 0) / 1024;
  const available = Math.round(grab("MemAvailable"));
  const swapTotal = Math.round(grab("SwapTotal"));
  const swapFree = Math.round(grab("SwapFree"));
  if (available < 400) warn(`RAM: only ${available} MiB available`);
  else ok(`RAM: ${available} MiB available, ${swapFree} MiB swap free`);

  const swapUsed = swapTotal - swapFree;
  if (swapUsed > 1024) warn(`swap: ${swapUsed} MiB of ${swapTotal} MiB in use — memory pressure`);
  else info(`swap: ${swapUsed} MiB of ${swapTotal} MiB in use`);

  const stats = run(["docker", "stats", "--no-stream", "--format", "{{.Name}}={{.MemUsage}}"]).out;
  if (stats.trim()) info(`container memory: ${lines(stats).join(" ")}`);

  let oom = Number(run(["journalctl", "-k", "--since", "-8 days", "--no-pager"]).out.split("\n").filter((line) => line.includes("Killed process")).length);
  if (oom === 0) oom = Number(run(["dmesg"]).out.split("\n").filter((line) => line.includes("Killed process")).length);
  if (oom > 0) warn(`kernel OOM: ${oom} process(es) killed in the last 8 days — caps are over-allocated, check swap and container memory`);
  else ok("no kernel OOM kills in the last 8 days");

  for (const profile of profiles().filter((name) => name !== "default")) {
    const home = homeOf(profile);
    if (!home) {
      warn(`${profile}: no sandbox home — terminal commands will recreate one`);
      continue;
    }
    const id = containerFor(profile, home);
    if (!id) {
      warn(`${profile}: no container found for its sandbox home`);
      continue;
    }
    const status = run(["docker", "inspect", "-f", "{{.State.Status}}", id]).out.trim();
    if (status !== "running") {
      if (dry) plan(`${profile}: container is ${status} — would start it`);
      else if (run(["docker", "start", id]).code === 0) act(`${profile}: container was ${status} — started`);
      else warn(`${profile}: container ${status} and start failed`);
      continue;
    }
    const label = run(["docker", "inspect", "-f", '{{index .Config.Labels "hermes-profile"}}', id]).out.trim();
    ok(`${profile}: container running${label ? ` (identity ${label})` : ""}`);
    const mount = run(["docker", "inspect", "-f", '{{range .Mounts}}{{if eq .Destination "/root"}}{{.Source}}{{end}}{{end}}', id]).out.trim();
    if (mount !== home) warn(`${profile}: /root mounted from unexpected path: ${mount || "none"}`);

    // Identity presence only — never a value.
    const missing = [".secrets", ".config/gh/hosts.yml", ".gitconfig", ".config/himalaya/config.toml"].filter((rel) => !existsSync(join(home, rel)));
    if (missing.length === 0) ok(`${profile}: identity present (.secrets, gh auth, gitconfig, mail config)`);
    else warn(`${profile}: identity file(s) MISSING: ${missing.join(", ")}`);

    // One restart per pass, gated on this profile's own live turns: the restart
    // kills every process inside, and clearing orphans is not worth a live turn.
    const leases = leaseCount(profile);
    if (leases === null) {
      warn(`${profile}: turn-lease store unreadable — container left running rather than risk a live turn`);
      continue;
    }
    if (leases > 0) {
      info(`${profile}: container left running — ${leases} live turn lease(s)`);
      continue;
    }
    if (dry) {
      plan(`${profile}: would restart container ${id} (no live turns)`);
      continue;
    }
    const before = Number(run(["docker", "exec", id, "sh", "-c", "ps -e --no-headers | wc -l"]).out.trim() || "2");
    if (run(["docker", "restart", id]).code !== 0) {
      warn(`${profile}: container restart failed — container ${id}`);
      continue;
    }
    const after = Number(run(["docker", "exec", id, "sh", "-c", "ps -e --no-headers | wc -l"]).out.trim() || "2");
    if (run(["docker", "inspect", "-f", "{{.State.Status}}", id]).out.trim() === "running") act(`${profile}: container restarted (cleared ${Math.max(0, before - after)} process(es); layer and home kept)`);
    else warn(`${profile}: container restarted but is not running — check docker logs ${id}`);
  }

  // Gateway: its pid file is JSON; the argv pattern is only a fallback.
  const pidFile = join(CFG.home, "gateway.pid");
  let gateway = 0;
  if (existsSync(pidFile)) {
    const pid = Number(readFileSync(pidFile, "utf8").match(/"pid"\s*:\s*(\d+)/)?.[1] ?? 0);
    if (pid && run(["/bin/kill", "-0", String(pid)]).code === 0) gateway = pid;
  }
  if (!gateway) {
    const pid = run(["pgrep", "-f", "gateway run"]).out.trim().split("\n")[0];
    gateway = Number(pid || 0);
  }
  if (gateway) ok(`gateway running (pid ${gateway})`);
  else warn("no hermes gateway process found — profiles cannot serve chat");

  if (run(["pgrep", "-f", "hermes dashboard"]).code === 0) ok("hermes-dashboard: running");
  else warn("hermes-dashboard: NOT running — remote dashboard access is down");
  if (run(["pgrep", "-x", "cloudflared"]).code === 0) ok("cloudflared: running");
  else warn("cloudflared: NOT running — remote dashboard access is down");

  const ready = run(["curl", "-s", "--max-time", "8", CFG.tunnelReady]).out.match(/"readyConnections"\s*:\s*(\d+)/)?.[1];
  if (ready === undefined) warn("cloudflared tunnel: readiness endpoint unreachable");
  else if (Number(ready) >= 1) ok(`cloudflared tunnel: ${ready} ready edge connection(s)`);
  else warn("cloudflared tunnel: 0 ready connections");

  // The dashboard must refuse on the public IP and gate its login over the public host.
  if (CFG.probePublicIp) {
    const ip = run(["curl", "-s", "--max-time", "8", "https://api.ipify.org"]).out.trim();
    if (ip) {
      const code = run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "6", `http://${ip}:9119/`]).out.trim();
      if (code === "000") ok(`dashboard: not reachable on the public IP (${ip}:9119 refused)`);
      else warn(`dashboard EXPOSED at ${ip}:9119 (HTTP ${code}) — it must stay loopback-only`);
    }
  }
  if (CFG.dashboard) {
    const code = run(["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}", "--max-time", "15", CFG.dashboard]).out.trim();
    if (["302", "401", "403"].includes(code)) ok(`dashboard gate: auth enforced at ${CFG.dashboard} (HTTP ${code})`);
    else if (code === "200") warn(`dashboard gate: ${CFG.dashboard} served 200 WITHOUT auth — verify the public URL setting`);
    else warn(`dashboard gate: unexpected HTTP ${code || "000"} from ${CFG.dashboard}`);
  }

  // Per-profile config, cron health, and the scheduler heartbeat.
  for (const profile of profiles()) {
    const dir = profileDir(profile);
    const config = existsSync(join(dir, "config.yaml")) ? readFileSync(join(dir, "config.yaml"), "utf8") : "";
    const provider = config.match(/^ {2}provider: (.+)$/m)?.[1];
    const model = config.match(/^ {2}default: (.+)$/m)?.[1];
    if (provider) info(`${profile} model: ${provider} / ${model ?? "unknown"}`);
    else warn(`${profile}: model.provider not found in config`);

    const jobsFile = join(dir, "cron", "jobs.json");
    if (existsSync(jobsFile)) {
      try {
        const parsed = JSON.parse(readFileSync(jobsFile, "utf8"));
        const jobs = Array.isArray(parsed) ? parsed : parsed.jobs ?? [];
        if (jobs.length === 0) info(`${profile}: no cron jobs defined`);
        for (const job of jobs) {
          const name = job.name ?? job.id;
          const status = String(job.last_status ?? "never");
          const streak = Number(job.failure_streak ?? 0);
          const base = `${profile} cron [${name}]: ${job.schedule_display ?? job.schedule} last=${status}`;
          if (job.enabled === false) warn(`${base} — job is DISABLED`);
          else if (streak >= 2) warn(`${base} — ${streak} consecutive failures: ${String(job.last_error ?? "").slice(0, 70)}`);
          else if (!["ok", "success", "running", "never"].includes(status)) warn(`${base} — error: ${String(job.last_error ?? "").slice(0, 70)}`);
          else ok(base);
        }
      } catch (error) {
        warn(`${profile}: cron/jobs.json unreadable (${error})`);
      }
    }
    const heartbeat = join(dir, "cron", "ticker_heartbeat");
    if (existsSync(heartbeat)) {
      const age = Math.floor((Date.now() - statSync(heartbeat).mtimeMs) / 1000);
      if (age > 3600) warn(`${profile}: cron ticker heartbeat ${age}s stale — scheduler may be stalled`);
    }
  }

  // Hermes itself, behind-count from git: `hermes update --check` over-reports.
  const install = run(["hermes", "--version"]).out.match(/^Install directory:\s*(.+)$/m)?.[1]?.trim() ?? join(CFG.home, "hermes-agent");
  if (existsSync(join(install, ".git"))) {
    run(["git", "-C", install, "fetch", "-q", "origin"], { timeout: 180_000 });
    const behind = run(["git", "-C", install, "rev-list", "--count", "HEAD..origin/main"]).out.trim();
    const version = run(["git", "-C", install, "describe", "--tags", "--always"]).out.trim();
    if (behind === "") info("hermes: version state unknown (git query failed)");
    else if (Number(behind) > 5) warn(`hermes: ${behind} commits behind origin/main (running ${version})`);
    else ok(`hermes: current (${version}, ${behind} behind)`);
  }

  // Shared fallback key: report the balance, never the key.
  const envFile = join(CFG.home, ".env");
  const key = existsSync(envFile) ? readFileSync(envFile, "utf8").match(/^DEEPSEEK_API_KEY=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") : "";
  if (key) {
    const body = run(["curl", "-s", "--max-time", "30", "-H", `Authorization: Bearer ${key}`, "https://api.deepseek.com/user/balance"], { timeout: 40_000 }).out;
    const balance = body.match(/"total_balance"\s*:\s*"([0-9.]+)"/)?.[1];
    info(balance ? `DeepSeek fallback balance (shared): $${balance}` : "DeepSeek balance: unavailable");
  }
}

// ---------------------------------------------------------------- 2. fleet: maintenance

function maintainStage(dry: boolean) {
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

const installDir = () =>
  run(["hermes", "--version"]).out.match(/^Install directory:\s*(.+)$/m)?.[1]?.trim() ?? join(CFG.home, "hermes-agent");

// ---------------------------------------------------------------- 3. sync

const SKIP_PATH = (rel: string) =>
  rel.split("/").some((part) => part.startsWith(".")) || /\.(pyc|lock|log)$|~$|\.swp$/.test(rel);

/** A skill is the agent's own when any file differs from stock or is absent there. */
export function collectSkills(profile: string, opts: { home?: string; stock?: string } = {}): string[] {
  const home = opts.home ?? CFG.home;
  const stock = opts.stock ?? CFG.stock;
  const root = profile === "default" ? join(home, "skills") : join(home, "profiles", profile, "skills");
  return walk(root)
    .map((path) => path.slice(root.length + 1))
    .filter((rel) => {
      if (SKIP_PATH(rel)) return false;
      const mine = join(root, rel);
      const theirs = join(stock, rel);
      if (!existsSync(theirs)) return true;
      try {
        return !readFileSync(mine).equals(readFileSync(theirs));
      } catch {
        return true;
      }
    });
}

const SECRET_SHAPES = [/ghp_[A-Za-z0-9]{20,}/, /sk-[A-Za-z0-9]{20,}/, /AKIA[0-9A-Z]{16}/, /BEGIN [A-Z ]*PRIVATE KEY/];

export type ArchiveResult = { profile: string; files: number; previous: number; status: "archived" | "refused-prune" | "refused-secret" | "empty" | "planned"; detail?: string };

/**
 * Archive each sandbox profile's own skills into agents/<name>/skills.
 * Refuses rather than publishes: a secret-shaped string, or a drop of more than
 * half the archive (a mount failure reads as 20 deleted skills).
 */
export function archiveSkills(opts: { repo?: string; home?: string; stock?: string; dry?: boolean; profiles?: string[] } = {}): ArchiveResult[] {
  const repo = opts.repo ?? CFG.repo;
  const home = opts.home ?? CFG.home;
  const stock = opts.stock ?? CFG.stock;
  const dry = opts.dry ?? false;
  const list = opts.profiles ?? profiles(home).filter((name) => name !== "default");
  const results: ArchiveResult[] = [];

  for (const profile of list) {
    const root = join(home, "profiles", profile, "skills");
    const dest = join(repo, "agents", profile, "skills");
    const manifestPath = join(repo, "agents", profile, "skills.manifest.json");
    const files = collectSkills(profile, { home, stock });
    if (files.length === 0) {
      results.push({ profile, files: 0, previous: 0, status: "empty" });
      continue;
    }
    let previous = 0;
    if (existsSync(manifestPath)) {
      try {
        previous = Object.keys(JSON.parse(readFileSync(manifestPath, "utf8")).files ?? {}).length;
      } catch {
        previous = 0;
      }
    }
    if (previous > 4 && files.length * 2 < previous) {
      results.push({ profile, files: files.length, previous, status: "refused-prune" });
      continue;
    }
    const secret = files.find((rel) => {
      try {
        const text = readFileSync(join(root, rel), "utf8");
        return SECRET_SHAPES.some((shape) => shape.test(text));
      } catch {
        return false;
      }
    });
    if (secret) {
      results.push({ profile, files: files.length, previous, status: "refused-secret", detail: secret });
      continue;
    }
    if (dry) {
      results.push({ profile, files: files.length, previous, status: "planned" });
      continue;
    }

    const manifest: Record<string, { sha256: string; origin: string }> = {};
    for (const rel of files) {
      const target = join(dest, rel);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(root, rel), target);
      const stockPath = join(stock, rel);
      const origin = !existsSync(stockPath) ? "authored" : readFileSync(stockPath).equals(readFileSync(target)) ? "stock" : "stock-modified";
      manifest[rel] = { sha256: sha256(target), origin };
    }
    writeFileSync(
      manifestPath,
      `${JSON.stringify(
        {
          agent: profile,
          note: `Archive of the skills this profile owns. Read by no agent; restore with cp -an agents/${profile}/skills/. into that profile skills directory.`,
          files: manifest,
        },
        null,
        2,
      )}\n`,
    );
    // Prune inside this agent's tree only.
    for (const path of walk(dest)) {
      const rel = path.slice(dest.length + 1);
      if (!(rel in manifest)) rmSync(path, { force: true });
    }
    for (const dir of walk(dest).map((path) => dirname(path))) {
      if (existsSync(dir) && readdirSync(dir).length === 0) rmSync(dir, { recursive: true, force: true });
    }
    results.push({ profile, files: files.length, previous, status: "archived" });
  }
  return results;
}

/** Root's profile is `default` on disk and `root` in the repository. */
const repoName = (profile: string) => (profile === "default" ? "root" : profile);

/** Seed a missing baseline from the last agreed version, before the rebase rewrites it. */
function seedBases(repo: string, bases: string) {
  mkdirSync(bases, { recursive: true });
  for (const name of profiles()) {
    const base = join(bases, `${repoName(name)}.md`);
    if (existsSync(base)) continue;
    const seeded = run(["git", "-C", repo, "show", `HEAD:agents/${repoName(name)}.md`]).out;
    if (seeded.trim()) writeFileSync(base, seeded);
  }
}

function mergeSoul(name: string, repo: string, bases: string): string {
  const repoFile = join(repo, "agents", `${repoName(name)}.md`);
  const soul = join(profileDir(name), "SOUL.md");
  const base = join(bases, `${repoName(name)}.md`);
  if (!existsSync(repoFile)) return `missing: ${repoFile}`;
  if (!existsSync(soul)) return `missing: ${soul}`;
  if (!existsSync(base)) return `missing: ${base}`;
  const same = (a: string, b: string) => {
    try {
      return readFileSync(a).equals(readFileSync(b));
    } catch {
      return false;
    }
  };
  if (same(repoFile, soul)) {
    copyFileSync(repoFile, base);
    return "sync";
  }
  if (same(soul, base)) {
    copyFileSync(repoFile, soul);
    copyFileSync(repoFile, base);
    return "to-profile";
  }
  if (same(repoFile, base)) {
    copyFileSync(soul, repoFile);
    copyFileSync(soul, base);
    return "to-repo";
  }
  const merged = run(["diff3", "-m", soul, base, repoFile]);
  if (merged.code === 0) {
    writeFileSync(soul, merged.out);
    writeFileSync(repoFile, merged.out);
    writeFileSync(base, merged.out);
    return "merged";
  }
  writeFileSync(`${base}.conflict.${Math.floor(Date.now() / 1000)}`, merged.out);
  return "conflict";
}

function syncStage(dry: boolean): boolean {
  let conflict = false;
  say("");
  say("3. SYNC");
  if (!existsSync(join(CFG.repo, ".git"))) {
    warn(`checkout missing at ${CFG.repo} — no org-config sync this pass`);
    return true;
  }
  const branch = run(["git", "-C", CFG.repo, "branch", "--show-current"]).out.trim();
  if (branch !== CFG.branch) {
    warn(`checkout is on '${branch}', expected '${CFG.branch}' — nothing touched`);
    return true;
  }

  if (run(["git", "-C", CFG.repo, "fetch", "--prune", "origin", "-q"], { timeout: 180_000 }).code !== 0)
    warn("git fetch failed (network/auth) — working from the last fetched refs");
  else ok(`origin/main ${run(["git", "-C", CFG.repo, "log", "--oneline", "-1", "origin/main"]).out.trim()}`);

  // Baselines are seeded before the rebase: a rebase rewrites the commit the
  // last agreed version lived in, and an empty baseline reads as a conflict.
  const bases = process.env.MAINT_SYNC_BASES ?? join("/var", "lib", "agents-sync", "agents");
  if (!dry) seedBases(CFG.repo, bases);

  const dirty = lines(run(["git", "-C", CFG.repo, "status", "--porcelain"]).out);
  if (dirty.length === 0) ok("working tree clean — nothing to harvest");
  else if (dry) plan(`harvest: would commit skill and soul edits among ${dirty.length} changed path(s)`);
  else {
    // Only the two trees the sync owns. Another session may be mid-write in the
    // same checkout, and anything else would ride a force-push onto `next`.
    run(["git", "-C", CFG.repo, "add", "--", "agents/", "skills/"]);
    const staged = lines(run(["git", "-C", CFG.repo, "diff", "--cached", "--name-only"]).out);
    if (staged.length === 0) info(`no skill or soul edit to harvest — ${dirty.length} other path(s) left in the tree`);
    else if (run(["git", "-C", CFG.repo, "commit", "-q", "-m", "sync: harvest uncommitted local agents/skills changes"]).code === 0)
      ok(`harvested ${staged.length} path(s): ${staged.slice(0, 6).join(", ")}${staged.length > 6 ? " …" : ""}`);
    else warn("harvest commit failed");
  }

  const containsMain = run(["git", "-C", CFG.repo, "merge-base", "--is-ancestor", "origin/main", "HEAD"]).code === 0;
  if (containsMain) ok(`${CFG.branch} already contains origin/main (${run(["git", "-C", CFG.repo, "rev-list", "--count", "origin/main..HEAD"]).out.trim()} commit(s) on top)`);
  else if (dry) plan(`rebase: would rebase ${CFG.branch} onto origin/main (${run(["git", "-C", CFG.repo, "rev-list", "--count", "HEAD..origin/main"]).out.trim()} behind)`);
  else {
    const rebase = run(["git", "-C", CFG.repo, "rebase", "origin/main"], { timeout: 300_000 });
    if (rebase.code === 0) ok(`rebased onto ${run(["git", "-C", CFG.repo, "log", "--oneline", "-1", "origin/main"]).out.trim()}`);
    else {
      run(["git", "-C", CFG.repo, "rebase", "--abort"]);
      warn(`rebase conflict — aborted, ${CFG.branch} left as it was; bots read a branch short of main until it is resolved`);
      conflict = true;
    }
  }

  say("");
  say("3a. SOULS (repo agents/<name>.md <-> profile SOUL.md)");
  for (const name of profiles()) {
    if (dry) {
      plan(`${name}: would three-way merge its soul`);
      continue;
    }
    const result = mergeSoul(name, CFG.repo, bases);
    switch (result) {
      case "sync": ok(`${name}: in sync`); break;
      case "to-profile": ok(`${name}: repo -> profile`); break;
      case "to-repo": ok(`${name}: profile -> repo (adopted)`); break;
      case "merged": ok(`${name}: both changed — merged (union kept)`); break;
      case "conflict":
        warn(`${name}: CONFLICT — both sides left untouched, merged attempt saved beside the baseline`);
        conflict = true;
        break;
      default:
        warn(`${name}: no merge — ${result}`);
        break;
    }
  }
  if (!dry && lines(run(["git", "-C", CFG.repo, "status", "--porcelain", "--", "agents/"]).out).length > 0) {
    run(["git", "-C", CFG.repo, "add", "agents/"]);
    if (run(["git", "-C", CFG.repo, "commit", "-q", "-m", "sync: adopt profile soul improvements into agents/"]).code === 0)
      ok(`committed soul adoption ${run(["git", "-C", CFG.repo, "log", "--oneline", "-1"]).out.trim()}`);
    else warn("soul commit failed");
  }

  say("");
  say("3b. SKILLS (profile skills -> agents/<name>/skills, archive only)");
  for (const result of archiveSkills({ dry })) {
    const label = `${result.profile}: ${result.files} file(s), was ${result.previous}`;
    if (result.status === "archived") ok(`${label} archived`);
    else if (result.status === "planned") plan(`${label} — would archive`);
    else if (result.status === "empty") warn(`${result.profile}: nothing to archive — skipped, nothing pruned`);
    else if (result.status === "refused-prune") {
      warn(`${result.profile}: advice REFUSED — ${result.files} files against ${result.previous} archived; raise the archive by hand if the drop is real`);
      conflict = true;
    } else {
      warn(`${result.profile}: REFUSED — a secret-shaped string in ${result.detail}`);
      conflict = true;
    }
  }
  if (!dry && lines(run(["git", "-C", CFG.repo, "status", "--porcelain", "--", "agents/"]).out).length > 0) {
    run(["git", "-C", CFG.repo, "add", "agents/"]);
    if (run(["git", "-C", CFG.repo, "commit", "-q", "-m", "sync: archive profile skills under agents/<name>/skills"]).code === 0)
      ok(`committed skill archive ${run(["git", "-C", CFG.repo, "log", "--oneline", "-1"]).out.trim()}`);
    else warn("archive commit failed");
  } else if (!dry) ok("skill archive unchanged");

  say("");
  say("3c. PUSH " + CFG.branch);
  // Compare shas, not rev-list counts: a deleted remote branch leaves no tracking ref.
  const local = run(["git", "-C", CFG.repo, "rev-parse", CFG.branch]).out.trim();
  const remote = run(["git", "-C", CFG.repo, "rev-parse", "--verify", "--quiet", `refs/remotes/origin/${CFG.branch}`]).out.trim();
  if (dry) plan(`push: would push ${local.slice(0, 7)} to origin/${CFG.branch}`);
  else if (!remote) {
    if (run(["git", "-C", CFG.repo, "push", "origin", `${CFG.branch}:${CFG.branch}`], { timeout: 300_000 }).code === 0)
      ok(`created origin/${CFG.branch} at ${local.slice(0, 7)}`);
    else warn(`push refused — origin/${CFG.branch} is absent; local ${CFG.branch} left unpushed`);
  } else if (remote !== local) {
    if (run(["git", "-C", CFG.repo, "push", "--force-with-lease", "origin", `${CFG.branch}:${CFG.branch}`], { timeout: 300_000 }).code === 0)
      ok(`pushed ${local.slice(0, 7)} to origin/${CFG.branch}`);
    else warn(`push refused (lease held?) — local ${CFG.branch} differs from origin, left as is`);
  } else ok(`origin/${CFG.branch} already at ${local.slice(0, 7)} — nothing to push`);

  say("");
  say("3d. STATE");
  const ahead = run(["git", "-C", CFG.repo, "rev-list", "--count", "origin/main..HEAD"]).out.trim();
  const behind = run(["git", "-C", CFG.repo, "rev-list", "--count", "HEAD..origin/main"]).out.trim();
  info(`${CFG.branch} is ${ahead} commit(s) ahead of origin/main, ${behind} behind`);
  for (const line of lines(run(["git", "-C", CFG.repo, "log", "--oneline", "origin/main..HEAD"]).out)) say(`       ${line}`);
  if (Number(ahead) > 0) info(`paths touched: ${run(["git", "-C", CFG.repo, "diff", "--name-only", "origin/main...HEAD"]).out.trim().split("\n").join(" ")}`);
  return conflict;
}

// ---------------------------------------------------------------- 5. leaks

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

function leaksStage() {
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

// ---------------------------------------------------------------- 4. upgrade

function upgradeStage(dry: boolean) {
  say("");
  say("5. UPGRADE");
  const live = liveTurns();
  if (live > 0) {
    warn(`upgrade skipped — ${live} live turn lease(s); a dockerd restart would kill them`);
    return;
  }
  if (dry) {
    plan("apt-get upgrade — would run (no live turns)");
    return;
  }
  const result = run(
    ["apt-get", "-o", "DPkg::Lock::Timeout=600", "-o", "Dpkg::Options::=--force-confold", "-o", "Dpkg::Options::=--force-confdef", "-y", "upgrade"],
    { timeout: 1_800_000 },
  );
  if (result.code === 0) {
    act("apt upgrade completed");
    if (existsSync("/var/run/reboot-required")) warn("reboot required after upgrade");
    else ok("no reboot required after upgrade");
  } else warn("apt upgrade failed — read the output above");
}

// ---------------------------------------------------------------- main

export function parseArgs(argv: string[]) {
  const only = argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
  const stages = (only ? only.split(",") : [...STAGES]).filter((name): name is Stage => (STAGES as readonly string[]).includes(name));
  return { dry: argv.includes("--dry-run"), upgrade: argv.includes("--upgrade"), stages };
}

function main() {
  const args = parseArgs(Bun.argv.slice(2));
  const explicitUpgrade = args.upgrade;

  say("==============================================================");
  say(` maintenance — ${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC (${run(["hostname"]).out.trim()})`);
  say(args.dry ? " dry run — nothing is changed" : "");
  say("==============================================================");

  if (args.stages.includes("host")) stageHost(args.dry);
  if (args.stages.includes("fleet")) {
    say("");
    say("2. FLEET (backups, health, safe maintenance)");
    backupStage(args.dry);
    healthStage(args.dry);
    maintainStage(args.dry);
  }
  let conflict = false;
  if (args.stages.includes("sync")) conflict = syncStage(args.dry);
  if (args.stages.includes("leaks")) {
    say("");
    say("4. LEAKS");
    leaksStage();
  }
  if (explicitUpgrade) upgradeStage(args.dry);

  say("");
  say("==============================================================");
  say(WARNS.length === 0 ? ` SUMMARY: healthy — no warnings. ${ACTS.length} action(s) taken.` : ` SUMMARY: ${WARNS.length} warning(s), ${ACTS.length} action(s) taken:`);
  for (const warning of WARNS) say(`  ! ${warning}`);
  say("==============================================================");

  // One previous pass is kept; the log is written whatever the exit code — but
  // a dry run writes nothing, not even a log line.
  if (!args.dry) try {
    mkdirSync(dirname(CFG.log), { recursive: true });
    if (existsSync(CFG.log) && statSync(CFG.log).size > 2 * 1024 * 1024) {
      rmSync(`${CFG.log}.prev`, { force: true });
      copyFileSync(CFG.log, `${CFG.log}.prev`);
      writeFileSync(CFG.log, "");
    }
    writeFileSync(CFG.log, LINES.join("\n") + "\n", { flag: "a" });
  } catch {
    // A log that cannot be written is not a reason to lose the report on stdout.
  }

  process.stdout.write(LINES.join("\n") + "\n");
  process.exit(conflict ? 2 : 0);
}

if (import.meta.main) main();
