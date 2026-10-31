/** Three-way soul merge, with the baseline that makes "both changed" decidable. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { profiles, profileDir } from "../../profile";
import { run } from "../../shell";

export const repoName = (profile: string) => (profile === "default" ? "root" : profile);

/** Seed a missing baseline from the last agreed version, before the rebase rewrites it. */
export function seedBases(repo: string, bases: string) {
  mkdirSync(bases, { recursive: true });
  for (const name of profiles()) {
    const base = join(bases, `${repoName(name)}.md`);
    if (existsSync(base)) continue;
    const seeded = run(["git", "-C", repo, "show", `HEAD:agents/${repoName(name)}.md`]).out;
    if (seeded.trim()) writeFileSync(base, seeded);
  }
}

export function mergeSoul(name: string, repo: string, bases: string): string {
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
