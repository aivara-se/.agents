/** The skill archive: which files a profile owns, and the cases that make the
 *  archive refuse rather than publish. Fixtures exercise all of them. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CFG } from "../../config";
import { sha256, walk } from "../../fsx";
import { profiles } from "../../profile";

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
