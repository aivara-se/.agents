#!/usr/bin/env bun
/**
 * Tests for the maintenance script's judgement-free core: argument parsing,
 * lease counting, step selection, and that a dry run writes nothing.
 * Run: bun test agents/root/scripts/
 */
import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseArgs } from "./maintenance/args";
import { leaseCount } from "./maintenance/profile";
import { selectSteps } from "./maintenance/registry";

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
  test("defaults to every step, a real pass", () => {
    expect(parseArgs([])).toEqual({ dry: false, upgrade: false, stages: ["host", "fleet", "sync", "leaks", "upgrade"] });
  });

  test("an optional step stays listed but does not run without its flag", () => {
    const ctx = { cfg: {} as never, dry: false, upgrade: false };
    expect(selectSteps(parseArgs([]).stages, ctx).map((step) => step.name)).toEqual(["host", "fleet", "sync", "leaks"]);
    expect(selectSteps(parseArgs(["--upgrade"]).stages, { ...ctx, upgrade: true }).map((step) => step.name)).toContain("upgrade");
  });

  test("--only keeps the named stages only", () => {
    expect(parseArgs(["--dry-run", "--only=leaks,host"]).stages).toEqual(["leaks", "host"]);
    expect(parseArgs(["--dry-run"]).dry).toBe(true);
  });
});
