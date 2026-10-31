/** Stage 2: backups, then health, then the safe repairs. The order is the contract
 *  — an archive exists before anything can be pruned. */
import type { Ctx } from "../context";
import { say } from "../report";
import { backups } from "./fleet/backups";
import { cleanup } from "./fleet/cleanup";
import { health } from "./fleet/health";

export function fleet(ctx: Ctx) {
  say("");
  say("2. FLEET (backups, health, safe maintenance)");
  backups(ctx);
  health(ctx);
  cleanup(ctx);
}
