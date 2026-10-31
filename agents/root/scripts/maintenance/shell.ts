/** Every external command goes through here: one place that decodes output,
 *  applies a timeout, and never throws on a missing binary. */
export type Res = { code: number; out: string; err: string };

export function run(cmd: string[], opts: { cwd?: string; timeout?: number } = {}): Res {
  try {
    const proc = Bun.spawnSync(cmd, {
      cwd: opts.cwd,
      stdout: "pipe",
      stderr: "pipe",
      timeout: opts.timeout ?? 120_000,
      env: process.env,
    });
    return {
      code: proc.exitCode ?? 1,
      out: proc.stdout ? new TextDecoder().decode(proc.stdout) : "",
      err: proc.stderr ? new TextDecoder().decode(proc.stderr) : "",
    };
  } catch (error) {
    return { code: 1, out: "", err: String(error) };
  }
}

export const lines = (text: string) => text.split("\n").filter((line) => line.length > 0);
