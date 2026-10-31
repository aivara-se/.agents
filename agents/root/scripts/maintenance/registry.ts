/** The pass, in the order it runs. Adding a step is a module plus one entry here;
 *  removing one is that same entry. Nothing else enumerates the stages. */
import type { Ctx } from "./context";
import { say } from "./report";
import { fleet } from "./stages/fleet";
import { host } from "./stages/host";
import { leaks, leaksHeading } from "./stages/leaks";
import { sync } from "./stages/sync";
import { upgrade } from "./stages/upgrade";
import type { Step } from "./step";

export const STEPS: Step[] = [
  { name: "host", run: host },
  { name: "fleet", run: fleet },
  { name: "sync", run: sync },
  {
    name: "leaks",
    run: (ctx: Ctx) => {
      say("");
      say(leaksHeading);
      leaks(ctx);
    },
  },
  { name: "upgrade", enabled: (ctx: Ctx) => ctx.upgrade, run: upgrade },
];

export const stepNames = (): string[] => STEPS.map((step) => step.name);

/** `--only` keeps the named steps in run order, whatever order it was typed in,
 *  and drops an optional step whose flag is absent. */
export function selectSteps(only: string[] | undefined, ctx: Ctx): Step[] {
  const chosen = only ? STEPS.filter((step) => only.includes(step.name)) : STEPS;
  return chosen.filter((step) => !step.enabled || step.enabled(ctx));
}
