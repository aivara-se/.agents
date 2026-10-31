/** Stage 3: git and the org config — harvest, rebase, souls, archive, push. It
 *  returns true when it leaves a decision to the agent, which exits the pass with 2. */
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Ctx } from "../context";
import { profiles } from "../profile";
import { info, ok, plan, say, warn } from "../report";
import { lines, run } from "../shell";
import { archiveSkills } from "./sync/archive";
import { mergeSoul, seedBases } from "./sync/souls";

export function sync(ctx: Ctx): boolean {
  const { cfg: CFG, dry } = ctx;
  let conflict = false;
  say("");
  say("3. SYNC");
  if (!existsSync(join(CFG.repo, ".git"))) {
    warn(`checkout missing at ${CFG.repo} — no org-config sync this pass`);
    return true;
  }
  const branch = run(["git", "-C", CFG.repo, "branch", "--show-current"]).out.trim();
  if (branch !== CFG.branch) {
    warn(`checkout is on '${branch}', expected '${CFG.branch}' — nothing touched`);
    return true;
  }

  if (run(["git", "-C", CFG.repo, "fetch", "--prune", "origin", "-q"], { timeout: 180_000 }).code !== 0)
    warn("git fetch failed (network/auth) — working from the last fetched refs");
  else ok(`origin/main ${run(["git", "-C", CFG.repo, "log", "--oneline", "-1", "origin/main"]).out.trim()}`);

  // Baselines are seeded before the rebase: a rebase rewrites the commit the
  // last agreed version lived in, and an empty baseline reads as a conflict.
  const bases = process.env.MAINT_SYNC_BASES ?? join("/var", "lib", "agents-sync", "agents");
  if (!dry) seedBases(CFG.repo, bases);

  const dirty = lines(run(["git", "-C", CFG.repo, "status", "--porcelain"]).out);
  if (dirty.length === 0) ok("working tree clean — nothing to harvest");
  else if (dry) plan(`harvest: would commit skill and soul edits among ${dirty.length} changed path(s)`);
  else {
    // Only the two trees the sync owns. Another session may be mid-write in the
    // same checkout, and anything else would ride a force-push onto `next`.
    run(["git", "-C", CFG.repo, "add", "--", "agents/", "skills/"]);
    const staged = lines(run(["git", "-C", CFG.repo, "diff", "--cached", "--name-only"]).out);
    if (staged.length === 0) info(`no skill or soul edit to harvest — ${dirty.length} other path(s) left in the tree`);
    else if (run(["git", "-C", CFG.repo, "commit", "-q", "-m", "sync: harvest uncommitted local agents/skills changes"]).code === 0)
      ok(`harvested ${staged.length} path(s): ${staged.slice(0, 6).join(", ")}${staged.length > 6 ? " …" : ""}`);
    else warn("harvest commit failed");
  }

  const containsMain = run(["git", "-C", CFG.repo, "merge-base", "--is-ancestor", "origin/main", "HEAD"]).code === 0;
  if (containsMain) ok(`${CFG.branch} already contains origin/main (${run(["git", "-C", CFG.repo, "rev-list", "--count", "origin/main..HEAD"]).out.trim()} commit(s) on top)`);
  else if (dry) plan(`rebase: would rebase ${CFG.branch} onto origin/main (${run(["git", "-C", CFG.repo, "rev-list", "--count", "HEAD..origin/main"]).out.trim()} behind)`);
  else {
    const rebase = run(["git", "-C", CFG.repo, "rebase", "origin/main"], { timeout: 300_000 });
    if (rebase.code === 0) ok(`rebased onto ${run(["git", "-C", CFG.repo, "log", "--oneline", "-1", "origin/main"]).out.trim()}`);
    else {
      run(["git", "-C", CFG.repo, "rebase", "--abort"]);
      warn(`rebase conflict — aborted, ${CFG.branch} left as it was; bots read a branch short of main until it is resolved`);
      conflict = true;
    }
  }

  say("");
  say("3a. SOULS (repo agents/<name>.md <-> profile SOUL.md)");
  for (const name of profiles()) {
    if (dry) {
      plan(`${name}: would three-way merge its soul`);
      continue;
    }
    const result = mergeSoul(name, CFG.repo, bases);
    switch (result) {
      case "sync": ok(`${name}: in sync`); break;
      case "to-profile": ok(`${name}: repo -> profile`); break;
      case "to-repo": ok(`${name}: profile -> repo (adopted)`); break;
      case "merged": ok(`${name}: both changed — merged (union kept)`); break;
      case "conflict":
        warn(`${name}: CONFLICT — both sides left untouched, merged attempt saved beside the baseline`);
        conflict = true;
        break;
      default:
        warn(`${name}: no merge — ${result}`);
        break;
    }
  }
  if (!dry && lines(run(["git", "-C", CFG.repo, "status", "--porcelain", "--", "agents/"]).out).length > 0) {
    run(["git", "-C", CFG.repo, "add", "agents/"]);
    if (run(["git", "-C", CFG.repo, "commit", "-q", "-m", "sync: adopt profile soul improvements into agents/"]).code === 0)
      ok(`committed soul adoption ${run(["git", "-C", CFG.repo, "log", "--oneline", "-1"]).out.trim()}`);
    else warn("soul commit failed");
  }

  say("");
  say("3b. SKILLS (profile skills -> agents/<name>/skills, archive only)");
  for (const result of archiveSkills({ dry })) {
    const label = `${result.profile}: ${result.files} file(s), was ${result.previous}`;
    if (result.status === "archived") ok(`${label} archived`);
    else if (result.status === "planned") plan(`${label} — would archive`);
    else if (result.status === "empty") warn(`${result.profile}: nothing to archive — skipped, nothing pruned`);
    else if (result.status === "refused-prune") {
      warn(`${result.profile}: advice REFUSED — ${result.files} files against ${result.previous} archived; raise the archive by hand if the drop is real`);
      conflict = true;
    } else {
      warn(`${result.profile}: REFUSED — a secret-shaped string in ${result.detail}`);
      conflict = true;
    }
  }
  if (!dry && lines(run(["git", "-C", CFG.repo, "status", "--porcelain", "--", "agents/"]).out).length > 0) {
    run(["git", "-C", CFG.repo, "add", "agents/"]);
    if (run(["git", "-C", CFG.repo, "commit", "-q", "-m", "sync: archive profile skills under agents/<name>/skills"]).code === 0)
      ok(`committed skill archive ${run(["git", "-C", CFG.repo, "log", "--oneline", "-1"]).out.trim()}`);
    else warn("archive commit failed");
  } else if (!dry) ok("skill archive unchanged");

  say("");
  say("3c. PUSH " + CFG.branch);
  // Compare shas, not rev-list counts: a deleted remote branch leaves no tracking ref.
  const local = run(["git", "-C", CFG.repo, "rev-parse", CFG.branch]).out.trim();
  const remote = run(["git", "-C", CFG.repo, "rev-parse", "--verify", "--quiet", `refs/remotes/origin/${CFG.branch}`]).out.trim();
  if (dry) plan(`push: would push ${local.slice(0, 7)} to origin/${CFG.branch}`);
  else if (!remote) {
    if (run(["git", "-C", CFG.repo, "push", "origin", `${CFG.branch}:${CFG.branch}`], { timeout: 300_000 }).code === 0)
      ok(`created origin/${CFG.branch} at ${local.slice(0, 7)}`);
    else warn(`push refused — origin/${CFG.branch} is absent; local ${CFG.branch} left unpushed`);
  } else if (remote !== local) {
    if (run(["git", "-C", CFG.repo, "push", "--force-with-lease", "origin", `${CFG.branch}:${CFG.branch}`], { timeout: 300_000 }).code === 0)
      ok(`pushed ${local.slice(0, 7)} to origin/${CFG.branch}`);
    else warn(`push refused (lease held?) — local ${CFG.branch} differs from origin, left as is`);
  } else ok(`origin/${CFG.branch} already at ${local.slice(0, 7)} — nothing to push`);

  say("");
  say("3d. STATE");
  const ahead = run(["git", "-C", CFG.repo, "rev-list", "--count", "origin/main..HEAD"]).out.trim();
  const behind = run(["git", "-C", CFG.repo, "rev-list", "--count", "HEAD..origin/main"]).out.trim();
  info(`${CFG.branch} is ${ahead} commit(s) ahead of origin/main, ${behind} behind`);
  for (const line of lines(run(["git", "-C", CFG.repo, "log", "--oneline", "origin/main..HEAD"]).out)) say(`       ${line}`);
  if (Number(ahead) > 0) info(`paths touched: ${run(["git", "-C", CFG.repo, "diff", "--name-only", "origin/main...HEAD"]).out.trim().split("\n").join(" ")}`);
  return conflict;
}
