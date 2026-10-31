#!/usr/bin/env bun
/**
 * Daily maintenance for this host and the Hermes fleet — the deterministic half
 * of `agents/root/maintenance.md`. It inspects, repairs what is reversible,
 * archives what is not reproducible, and prints one log. The agent that reads
 * the log takes the judgement calls: conflicts, the upgrade, stale skill prose.
 *
 * Run:
 *   bun run agents/root/scripts/maintenance/index.ts            # every stage
 *   bun run agents/root/scripts/maintenance/index.ts --dry-run  # plan, change nothing
 *   bun run agents/root/scripts/maintenance/index.ts --only=leaks
 *   bun run agents/root/scripts/maintenance/index.ts --upgrade
 *
 * Exit: 0 clean, 2 conflict (nothing left half-done), 1 hard error.
 *
 * The stages are a list (`registry.ts`); this file only assembles the context,
 * runs the list, and owns the summary, the log and the exit code.
 */
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import { parseArgs } from "./args";
import { loadConfig } from "./config";
import type { Ctx } from "./context";
import { selectSteps } from "./registry";
import { report, say } from "./report";
import { run } from "./shell";

/** One previous pass is kept; a dry run writes nothing, not even a log line. */
function writeLog(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path) && statSync(path).size > 2 * 1024 * 1024) {
    rmSync(`${path}.prev`, { force: true });
    copyFileSync(path, `${path}.prev`);
    writeFileSync(path, "");
  }
  writeFileSync(path, text, { flag: "a" });
}

function main() {
  const args = parseArgs(Bun.argv.slice(2));
  const cfg = loadConfig();
  const ctx: Ctx = { cfg, dry: args.dry, upgrade: args.upgrade };

  say("==============================================================");
  say(` maintenance — ${new Date().toISOString().replace("T", " ").slice(0, 16)} UTC (${run(["hostname"]).out.trim()})`);
  if (args.dry) say(" dry run — nothing is changed");
  say("==============================================================");

  let conflict = false;
  for (const step of selectSteps(args.stages, ctx)) {
    if (step.run(ctx) === true) conflict = true;
  }

  say("");
  say("==============================================================");
  for (const line of report.summary()) say(line);
  say("==============================================================");

  if (!args.dry) {
    try {
      writeLog(cfg.log, report.lines.join("\n") + "\n");
    } catch {
      // A log that cannot be written is not a reason to lose the report on stdout.
    }
  }

  process.stdout.write(report.lines.join("\n") + "\n");
  process.exit(conflict ? 2 : 0);
}

if (import.meta.main) main();
