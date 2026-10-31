#!/usr/bin/env bun
/**
 * The prose gate: words per file, words per rule, words per sentence, banned
 * filler, and a sentence two skills both state. Run: bun run scripts/check-prose.ts
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");

const BUDGETS: { match: RegExp; max: number }[] = [
  { match: /^skills\/[^/]+\/SKILL\.md$/, max: 900 },
  { match: /^skills\/[^/]+\/references\/.+\.md$/, max: 750 },
  { match: /^skills\/[^/]+\/templates\/.+\.md$/, max: 750 },
  { match: /^agents\/[^/]+\/skills\/.+\.md$/, max: 12000 },
  { match: /^agents\/[^/]+\/maintenance\.md$/, max: 500 },
  { match: /^agents\/[^/]+\.md$/, max: 260 },
  { match: /^(AGENTS|README)\.md$/, max: 400 },
];

const RULE_WORDS = 30;
const SENTENCE_WORDS = 35;
const BANNED = [
  "simply",
  "just",
  "note that",
  "it is worth noting",
  "in order to",
  "as you know",
  "please note",
  "leverage",
];

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

function markdown(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git" || entry.name === "node_modules") return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return markdown(path);
    return entry.name.endsWith(".md") ? [path] : [];
  });
}

const problems: string[] = [];
const report = (file: string, line: number | null, message: string) =>
  problems.push(`${file}${line ? `:${line}` : ""} — ${message}`);

function withoutFrontMatter(source: string): string {
  return source.replace(/^---\n[\s\S]*?\n---\n/, "");
}

function sentencesOf(body: string): string[] {
  return body
    .replace(/```[\s\S]*?```/g, " ")
    .split("\n")
    .filter((line) => !/^\s*#{1,6} /.test(line))
    .flatMap((line) => line.split(/(?<=[.!?])\s+/));
}

const seen = new Map<string, string[]>();

for (const path of markdown(ROOT)) {
  const file = relative(ROOT, path);
  const source = readFileSync(path, "utf8");
  const body = withoutFrontMatter(source);
  const isSkill = /^skills\/[^/]+\/SKILL\.md$/.test(file);

  const budget = BUDGETS.find((candidate) => candidate.match.test(file));
  if (!budget) {
    report(file, null, "no word budget: add the path to BUDGETS");
    continue;
  }
  if (words(body) > budget.max) {
    report(file, null, `${words(body)} words, the budget is ${budget.max}`);
  }
  // The archive mirrors a profile's own text so a rebuild can put it back. A
  // rule it breaks is that profile's to fix, not this repository's: policing it
  // here turns a backup into a red build nobody can satisfy without editing the
  // archived copy, which the next sync overwrites.
  if (/^agents\/[^/]+\/skills\//.test(file)) continue;

  let inFence = false;
  let inFrontMatter = source.startsWith("---\n");
  source.split("\n").forEach((raw, index) => {
    const line = raw.trimEnd();
    if (inFrontMatter) {
      if (index > 0 && line === "---") inFrontMatter = false;
      return;
    }
    if (line.startsWith("```")) {
      inFence = !inFence;
      return;
    }
    if (inFence || !line.trim() || line.startsWith("#")) return;

    if (isSkill && /^\s*(-|\d+\.)\s/.test(line) && words(line) > RULE_WORDS) {
      report(file, index + 1, `${words(line)} words in a rule, the limit is ${RULE_WORDS}`);
    }

    for (const sentence of line.split(/(?<=[.!?])\s+/)) {
      if (words(sentence) > SENTENCE_WORDS) {
        report(file, index + 1, `${words(sentence)} words in a sentence, the limit is ${SENTENCE_WORDS}`);
      }
    }

    const plain = line.replace(/`[^`]*`/g, " ").replace(/"[^"]*"/g, " ").toLowerCase();
    for (const banned of BANNED) {
      if (new RegExp(`\\b${banned}\\b`).test(plain)) {
        report(file, index + 1, `"${banned}" is filler: cut it`);
      }
    }
  });

  if (isSkill) {
    for (const sentence of sentencesOf(body)) {
      const key = sentence
        .replace(/[`*_]/g, "")
        .replace(/[^\w\s,%-]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      if (words(key) < 10) continue;
      const files = seen.get(key) ?? [];
      if (!files.includes(file)) files.push(file);
      seen.set(key, files);
    }
  }
}

for (const [sentence, files] of seen) {
  if (files.length > 1) {
    report(files.join(" and "), null, `the same sentence appears twice: "${sentence.slice(0, 70)}"`);
  }
}

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  console.error(`\n${problems.length} problem(s).`);
  process.exit(1);
}

console.log("prose ok");
