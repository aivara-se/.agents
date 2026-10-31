/**
 * One sink for the whole pass. A step writes through it and nothing else, so the
 * summary, the counts and the log stay in one place while steps come and go.
 */
export class Reporter {
  readonly lines: string[] = [];
  readonly warnings: string[] = [];
  readonly actions: string[] = [];

  say(line = "") { this.lines.push(line); }
  ok(msg: string) { this.lines.push(`  [ok]   ${msg}`); }
  info(msg: string) { this.lines.push(`  · ${msg}`); }
  warn(msg: string) { this.warnings.push(msg); this.lines.push(`  [WARN] ${msg}`); }
  act(msg: string) { this.actions.push(msg); this.lines.push(`  [act]  ${msg}`); }
  plan(msg: string) { this.lines.push(`  [plan] ${msg}`); }

  /** The closing block every pass ends with. */
  summary(): string[] {
    const head =
      this.warnings.length === 0
        ? ` SUMMARY: healthy — no warnings. ${this.actions.length} action(s) taken.`
        : ` SUMMARY: ${this.warnings.length} warning(s), ${this.actions.length} action(s) taken:`;
    return [head, ...this.warnings.map((warning) => `  ! ${warning}`)];
  }
}

export const report = new Reporter();
export const say = (line?: string) => report.say(line);
export const ok = (msg: string) => report.ok(msg);
export const info = (msg: string) => report.info(msg);
export const warn = (msg: string) => report.warn(msg);
export const act = (msg: string) => report.act(msg);
export const plan = (msg: string) => report.plan(msg);
