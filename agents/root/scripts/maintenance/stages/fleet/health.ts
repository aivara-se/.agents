/** Read-only health: disk, memory, containers, gateway, tunnel, dashboard, config,
 *  cron, and the provider balance. One restart, only when no turn is live. */
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "../../context";
import { diskFreeGiB } from "../../fsx";
import { homeOf, installDir, leaseCount, profileDir, profiles } from "../../profile";
import { act, info, ok, plan, warn } from "../../report";
import { lines, run } from "../../shell";

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

export function health(ctx: Ctx) {
  const { cfg: CFG, dry } = ctx;
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
