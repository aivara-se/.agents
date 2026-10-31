/** Stage 5: the package upgrade, off by default and never beside a live turn. */
import { existsSync } from "node:fs";
import type { Ctx } from "../context";
import { liveTurns } from "../profile";
import { act, ok, plan, say, warn } from "../report";
import { run } from "../shell";

export function upgrade(ctx: Ctx) {
  const { dry } = ctx;
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
