/** Stage 3: git and the org config. The script prepares one reviewable diff —
 *  souls merged — and stops there. The agent rebases, rewrites
 *  the harvested skills to house standard, commits, pushes `next` and refreshes
 *  the `next -> main` pull request. Nothing here commits, rebases or pushes: one
 *  owner for the rewrite means it cannot be left half-done.
 *  Returns true when it leaves a decision to the agent, which exits the pass with 2. */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "../context";
import { profiles } from "../profile";
import { info, ok, plan, say, warn } from "../report";
import { lines, run } from "../shell";
import { mergeSoul, seedBases } from "./sync/souls";

/** What the agent does with each group the pass leaves in the tree. */
const VERBATIM = "commit verbatim — a record, not prose";

export function sync(ctx: Ctx): boolean {
  const { cfg: CFG, dry } = ctx;
  let conflict = false;
  say("");
  say(
    "3. SYNC (the script prepares the diff; the agent rebases, reviews, commits, pushes)",
  );
  if (!existsSync(join(CFG.repo, ".git"))) {
    warn(`checkout missing at ${CFG.repo} — no org-config sync this pass`);
    return true;
  }
  const branch = run([
    "git",
    "-C",
    CFG.repo,
    "branch",
    "--show-current",
  ]).out.trim();
  if (branch !== CFG.branch) {
    warn(
      `checkout is on '${branch}', expected '${CFG.branch}' — nothing touched`,
    );
    return true;
  }

  if (
    run(["git", "-C", CFG.repo, "fetch", "--prune", "origin", "-q"], {
      timeout: 180_000,
    }).code !== 0
  )
    warn(
      "git fetch failed (network/auth) — working from the last fetched refs",
    );
  else
    ok(
      `origin/main ${run(["git", "-C", CFG.repo, "log", "--oneline", "-1", "origin/main"]).out.trim()}`,
    );

  // The sha the push's lease must hold. Absent after a merge deleted the branch.
  const base = run([
    "git",
    "-C",
    CFG.repo,
    "rev-parse",
    "--verify",
    "--quiet",
    `refs/remotes/origin/${CFG.branch}`,
  ]).out.trim();
  if (base)
    info(
      `origin/${CFG.branch} ${base.slice(0, 7)} — the lease the push must hold`,
    );
  else info(`origin/${CFG.branch} is absent — the push recreates it`);

  // Baselines are seeded before the rebase: a rebase rewrites the commit the
  // last agreed version lived in, and an empty baseline reads as a conflict.
  const bases =
    process.env.MAINT_SYNC_BASES ??
    join("/var", "lib", "agents-sync", "agents");
  if (!dry) seedBases(CFG.repo, bases);

  say("");
  say("3a. SOULS (repo agents/<name>.md <-> profile SOUL.md)");
  for (const name of profiles()) {
    if (dry) {
      plan(`${name}: would three-way merge its soul`);
      continue;
    }
    const result = mergeSoul(name, CFG.repo, bases);
    switch (result) {
      case "sync":
        ok(`${name}: in sync`);
        break;
      case "to-profile":
        ok(`${name}: repo -> profile`);
        break;
      case "to-repo":
        ok(`${name}: profile -> repo (adopted)`);
        break;
      case "merged":
        ok(`${name}: both changed — merged (union kept)`);
        break;
      case "conflict":
        warn(
          `${name}: CONFLICT — both sides left untouched, merged attempt saved beside the baseline`,
        );
        conflict = true;
        break;
      default:
        warn(`${name}: no merge — ${result}`);
        break;
    }
  }

  say("");
  say("3c. REVIEW QUEUE (the script commits nothing)");
  if (dry) {
    plan("review: would list every path the agent must rewrite or commit");
  } else {
    const groups: Record<
      "skills" | "souls" | "agentSkills" | "other",
      string[]
    > = { skills: [], souls: [], agentSkills: [], other: [] };
    for (const raw of lines(
      run(["git", "-C", CFG.repo, "status", "--porcelain"]).out,
    )) {
      const path = raw.slice(3).trim().replace(/^"|"$/g, "");
      if (path.startsWith("skills/")) groups.skills.push(path);
      else if (/^agents\/[^/]+\.md$/.test(path)) groups.souls.push(path);
      else if (/^agents\/[^/]+\/skills(\.manifest\.json|\/)/.test(path))
        groups.agentSkills.push(path);
      else groups.other.push(path);
    }
    if (groups.skills.length === 0) ok("no harvested skill edit to review");
    else {
      warn(
        `${groups.skills.length} skill path(s) to review and rewrite — never commit them as they are`,
      );
      for (const path of groups.skills.slice(0, 12)) say(`       ${path}`);
      if (groups.skills.length > 12)
        say(`       … ${groups.skills.length - 12} more`);
    }
    if (groups.souls.length)
      info(
        `${groups.souls.length} soul path(s) to ${VERBATIM}: ${groups.souls.join(" ")}`,
      );
    if (groups.agentSkills.length)
      info(`${groups.agentSkills.length} agent-skill path(s) to ${VERBATIM}`);
    if (groups.other.length)
      info(
        `${groups.other.length} path(s) outside agents/ and skills/ left untouched: ${groups.other.slice(0, 6).join(" ")}`,
      );
  }

  say("");
  say(
    "3d. HAND-OFF (the run's contract — anything short of it is a failed run)",
  );
  say(`  base: ${base || "(no remote branch)"}`);
  say(
    "  1. rebase next onto origin/main; a conflict is resolved by rewriting both sides to writing/coding, never by taking one",
  );
  say(
    "  2. rewrite the review queue to house standard and fold it, with the souls and the agents' own skills, into one commit",
  );
  say(
    `     agent skills and souls verbatim; the message says what changed and why`,
  );
  if (base)
    say(
      `  3. git push --force-with-lease=${CFG.branch}:${base} origin ${CFG.branch}`,
    );
  else
    say(
      `  3. git push -u origin ${CFG.branch}   (no remote branch yet — plain create)`,
    );
  say(
    "  4. verify: next == origin/next, HEAD..origin/main = 0, origin/main..next > 0",
  );
  say(
    "  5. create or refresh the next -> main pull request: title and body describe exactly what it carries",
  );
  say(
    "  6. cannot finish? abort the rebase and leave next exactly as you found it — a half-synced next is worse than a late one",
  );

  say("");
  say("3e. STATE (before the agent's rebase)");
  const ahead = run([
    "git",
    "-C",
    CFG.repo,
    "rev-list",
    "--count",
    "origin/main..HEAD",
  ]).out.trim();
  const behind = run([
    "git",
    "-C",
    CFG.repo,
    "rev-list",
    "--count",
    "HEAD..origin/main",
  ]).out.trim();
  info(
    `${CFG.branch} is ${ahead} commit(s) ahead of origin/main, ${behind} behind`,
  );
  for (const line of lines(
    run(["git", "-C", CFG.repo, "log", "--oneline", "origin/main..HEAD"]).out,
  ))
    say(`       ${line}`);
  if (base) {
    const replaced = run([
      "git",
      "-C",
      CFG.repo,
      "rev-list",
      "--count",
      "origin/main..origin/" + CFG.branch,
    ]).out.trim();
    info(
      `origin/${CFG.branch} carries ${replaced} commit(s) not in main — the push replaces them with the rebased ${ahead}`,
    );
  }
  return conflict;
}
