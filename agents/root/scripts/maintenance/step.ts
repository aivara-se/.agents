import type { Ctx } from "./context";

/** One unit of work. `run` returns true when it leaves a decision to the agent;
 *  `enabled` keeps an optional step in the list but off by default. */
export type Step = {
  name: string;
  enabled?: (ctx: Ctx) => boolean;
  run(ctx: Ctx): boolean | void;
};
