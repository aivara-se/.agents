import type { Config } from "./config";

/** What a step is handed: the resolved configuration and the two switches. */
export type Ctx = { cfg: Config; dry: boolean; upgrade: boolean };
