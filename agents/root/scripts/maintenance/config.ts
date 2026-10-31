import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Every path and cadence the pass uses, read once from the environment. A rebuilt
 * host maps its own layout without editing a module.
 */
export function loadConfig(env: Record<string, string | undefined> = process.env) {
  const home = env.HERMES_HOME ?? join(homedir(), ".hermes");
  return {
    home,
    backups: env.HERMES_BACKUP_DIR ?? join(homedir(), "backups", "hermes"),
    repo: env.AGENTS_REPO ?? join(homedir(), "github", "aivara-se", ".agents"),
    stock: env.MAINT_STOCK ?? join(home, "hermes-agent", "skills"),
    log: env.MAINT_LOG ?? join("/var", "log", "maintenance.log"),
    bases: env.MAINT_SYNC_BASES ?? join("/var", "lib", "agents-sync", "agents"),
    branch: "next",
    keep: Number(env.MAINT_KEEP ?? "8"),
    dashboard: env.MAINT_DASHBOARD_URL ?? "",
    tunnelReady: env.MAINT_TUNNEL_READY ?? "http://127.0.0.1:20241/ready",
    probePublicIp: env.MAINT_PUBLIC_IP_PROBE === "1",
    staleTurnSeconds: 6 * 3600,
  };
}

export type Config = ReturnType<typeof loadConfig>;

/** The default instance helper modules fall back to; a run passes its own through `Ctx`. */
export const CFG = loadConfig();
