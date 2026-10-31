/** A pure argument parser: no side effects, so the flags are testable on their own. */
import { stepNames } from "./registry";

export type Args = { dry: boolean; upgrade: boolean; stages: string[] };

export function parseArgs(argv: string[]): Args {
  const only = argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
  const known = stepNames();
  const stages = (only ? only.split(",") : known).filter((name) => known.includes(name));
  return { dry: argv.includes("--dry-run"), upgrade: argv.includes("--upgrade"), stages };
}
