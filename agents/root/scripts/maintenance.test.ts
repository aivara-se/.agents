#!/usr/bin/env bun
/**
 * Tests for the maintenance script's judgement-free core: which skill files are
 * the agent's own, what the archive refuses, and that a dry run writes nothing.
 * Run: bun test agents/root/scripts/
 */
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { archiveSkills, collectSkills, leaseCount, parseArgs } from "./maintenance";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "maintenance-test-"));
  const home = join(root, "hermes");
  const repo = join(root, "repo");
  const stock = join(home, "hermes-agent", "skills");
  const skills = join(home, "profiles", "mama", "skills");

  const write = (path: string, text: string) => {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, text);
  };

  write(join(stock, "writing", "SKILL.md"), "stock prose\n");
  write(join(skills, "writing", "SKILL.md"), "stock prose\n");
  write(join(skills, "writing", "references", "note.md"), "an added reference\n");
  write(join(skills, "agent-operations", "host-ops", "SKILL.md"), "authored skill\n");
  write(join(skills, ".state", "ignore.md"), "runtime state\n");

  return { root, home, repo, stock, skills, write };
}

describe("collectSkills", () => {
  test("takes authored and stock-modified files, skips pristine stock and dotfiles", () => {
    const { home, stock } = fixture();
    const files = collectSkills("mama", { home, stock });
    expect(files).toContain("agent-operations/host-ops/SKILL.md");
    expect(files).toContain("writing/references/note.md");
    expect(files).not.toContain("writing/SKILL.md");
    expect(files.some((file) => file.includes("/."))).toBe(false);
  });
});

describe("archiveSkills", () => {
  test("archives the agent's own files and records their origin", () => {
    const { home, repo, stock } = fixture();
    const results = archiveSkills({ home, repo, stock, profiles: ["mama"] });
    expect(results[0]).toMatchObject({ profile: "mama", status: "archived", files: 2 });

    const manifest = JSON.parse(readFileSync(join(repo, "agents", "mama", "skills.manifest.json"), "utf8"));
    expect(manifest.files["agent-operations/host-ops/SKILL.md"].origin).toBe("authored");
    expect(manifest.files["writing/references/note.md"].origin).toBe("authored");
    expect(manifest.files["agent-operations/host-ops/SKILL.md"].sha256).toHaveLength(64);
    expect(existsSync(join(repo, "agents", "mama", "skills", "agent-operations", "host-ops", "SKILL.md"))).toBe(true);
  });

  test("refuses a secret-shaped string instead of publishing it", () => {
    const { home, repo, stock, skills, write } = fixture();
    write(join(skills, "leaky", "SKILL.md"), "token ghp_abcdefghijklmnopqrstuvwx\n");
    const results = archiveSkills({ home, repo, stock, profiles: ["mama"] });
    expect(results[0].status).toBe("refused-secret");
    expect(existsSync(join(repo, "agents", "mama", "skills", "leaky", "SKILL.md"))).toBe(false);
  });

  test("refuses a drop of more than half the archive", () => {
    const { home, repo, stock, skills, write } = fixture();
    archiveSkills({ home, repo, stock, profiles: ["mama"] });
    for (let index = 0; index < 8; index += 1) write(join(skills, `extra-${index}`, "SKILL.md"), `skill ${index}\n`);
    archiveSkills({ home, repo, stock, profiles: ["mama"] });
    for (let index = 0; index < 8; index += 1) {
      const dir = join(skills, `extra-${index}`);
      Bun.spawnSync(["rm", "-rf", dir]);
    }
    const results = archiveSkills({ home, repo, stock, profiles: ["mama"] });
    expect(results[0].status).toBe("refused-prune");
    expect(existsSync(join(repo, "agents", "mama", "skills", "extra-0", "SKILL.md"))).toBe(true);
  });

  test("an empty profile is reported, not archived", () => {
    const { home, repo, stock } = fixture();
    const results = archiveSkills({ home, repo, stock, profiles: ["momo"] });
    expect(results[0].status).toBe("empty");
    expect(existsSync(join(repo, "agents", "momo"))).toBe(false);
  });

  test("a dry run writes nothing", () => {
    const { home, repo, stock } = fixture();
    const results = archiveSkills({ home, repo, stock, profiles: ["mama"], dry: true });
    expect(results[0].status).toBe("planned");
    expect(existsSync(join(repo, "agents"))).toBe(false);
  });
});

describe("leaseCount", () => {
  test("an unreadable store is null, never zero", () => {
    const { root } = fixture();
    const home = join(root, "hermes");
    mkdirSync(join(home, "profiles", "leaky"), { recursive: true });
    writeFileSync(join(home, "profiles", "leaky", "state.db"), "not a database");
    expect(leaseCount("leaky", home)).toBeNull();
  });

  test("counts only unexpired leases", () => {
    const { root } = fixture();
    const home = join(root, "hermes");
    const dir = join(home, "profiles", "mama");
    mkdirSync(dir, { recursive: true });
    const db = new Database(join(dir, "state.db"));
    db.exec("create table session_turn_leases (expires_at integer)");
    db.exec(`insert into session_turn_leases values (${Math.floor(Date.now() / 1000) + 600})`);
    db.exec("insert into session_turn_leases values (1)");
    db.close();
    expect(leaseCount("mama", home)).toBe(1);
  });
});

describe("parseArgs", () => {
  test("defaults to every stage and a real pass", () => {
    expect(parseArgs([])).toEqual({ dry: false, upgrade: false, stages: ["host", "fleet", "sync", "leaks"] });
  });

  test("--only keeps the named stages only", () => {
    expect(parseArgs(["--dry-run", "--only=leaks,host"]).stages).toEqual(["leaks", "host"]);
    expect(parseArgs(["--dry-run"]).dry).toBe(true);
  });
});
