/** Small filesystem helpers: no policy and no output, so a stage stays readable. */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { lines, run } from "./shell";

export const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

export function walk(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out.sort();
}

export const olderThan = (dir: string, days: number): string[] => {
  const cutoff = Date.now() - days * 86_400_000;
  return walk(dir).filter((path) => {
    try {
      return statSync(path).mtimeMs < cutoff;
    } catch {
      return false;
    }
  });
};

export const human = (bytes: number) => {
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
};

export const diskFreeGiB = () => {
  const r = run(["df", "-P", "/"]);
  const row = lines(r.out)[1]?.split(/\s+/);
  return row ? Number(row[3]) / 1_048_576 : 0;
};
