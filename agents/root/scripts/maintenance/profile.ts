import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Database } from "bun:sqlite";
import { CFG } from "./config";
import { run } from "./shell";

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

export const profileDir = (profile: string, home = CFG.home) =>
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

export const liveTurns = () => profiles().reduce((sum, profile) => sum + (leaseCount(profile) ?? 1), 0);

/** The hermes install the host actually runs, not the path a default would guess. */
export const installDir = (): string =>
  run(["hermes", "--version"]).out.match(/^Install directory:\s*(.+)$/m)?.[1]?.trim() ?? join(CFG.home, "hermes-agent");
