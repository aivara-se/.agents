/** State and identity archives, their retention, and the unpushed-work report.
 *  A tarball is written before anything is pruned, so a bad day costs nothing. */
import { chmodSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { Ctx } from "../../context";
import { human } from "../../fsx";
import { homeOf, profileDir, profiles } from "../../profile";
import { act, info, ok, plan, warn } from "../../report";
import { lines, run } from "../../shell";

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

export function backups(ctx: Ctx) {
  const { cfg: CFG, dry } = ctx;
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
