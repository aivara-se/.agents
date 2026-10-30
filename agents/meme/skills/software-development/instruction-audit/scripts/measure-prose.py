#!/usr/bin/env python3
"""Measure an instruction corpus before cutting it.

Usage: python3 scripts/measure-prose.py <dir>

Prints words and rules per file, bullet length (average and worst), the share
of sentences past 40 words, and the share of identical lines between files
that look alike. Read the worst bullet and the duplicate pairs; those are the
cut.
"""

import glob
import os
import re
import sys


def strip_frontmatter(text):
    return re.sub(r"^---\n.*?\n---\n", "", text, count=1, flags=re.S)


def measure(path):
    with open(path, encoding="utf-8") as handle:
        text = strip_frontmatter(handle.read())
    words = len(text.split())
    bullets = [l.strip() for l in text.splitlines() if l.strip().startswith(("- ", "* "))]
    numbers = [l.strip() for l in text.splitlines() if re.match(r"^\d+\. ", l.strip())]
    rules = bullets + numbers
    sizes = [len(b.split()) for b in rules]
    flat = text.replace("\n", " ")
    sentences = [s for s in re.split(r"(?<=[.;:])\s+", flat) if len(s.split()) > 3]
    long_share = (
        round(100 * sum(1 for s in sentences if len(s.split()) > 40) / len(sentences))
        if sentences
        else 0
    )
    return {
        "path": path,
        "words": words,
        "rules": len(rules),
        "avg": round(sum(sizes) / len(sizes)) if sizes else 0,
        "max": max(sizes) if sizes else 0,
        "long": long_share,
        "tokens": round(words * 1.35),
        "lines": set(l.strip() for l in text.splitlines() if len(l.split()) > 4),
    }


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    files = sorted(
        f for f in glob.glob(os.path.join(root, "**/*.md"), recursive=True)
        if "/.git/" not in f and "/node_modules/" not in f
    )
    if not files:
        print(f"no markdown under {root}")
        return 1

    rows = [measure(f) for f in files]
    print(f"{'file':52}{'words':>6}{'rules':>6}{'avg':>5}{'max':>5}{'40+w':>6}{'tokens':>7}")
    for r in rows:
        print(
            f"{os.path.relpath(r['path'], root):52}{r['words']:>6}{r['rules']:>6}"
            f"{r['avg']:>5}{r['max']:>5}{str(r['long']) + '%':>6}{r['tokens']:>7}"
        )
    print(
        f"{'total':52}{sum(r['words'] for r in rows):>6}"
        f"{sum(r['rules'] for r in rows):>6}"
        f"{'':>5}{'':>5}{'':>6}{sum(r['tokens'] for r in rows):>7}"
    )

    print("\nShared lines between files (a copy that drifts is a duplicate):")
    for i, a in enumerate(rows):
        for b in rows[i + 1:]:
            small = min(len(a["lines"]), len(b["lines"]))
            if not small:
                continue
            shared = len(a["lines"] & b["lines"])
            pct = round(100 * shared / small)
            if pct >= 25:
                print(
                    f"  {os.path.relpath(a['path'], root)} ~ "
                    f"{os.path.relpath(b['path'], root)}: {pct}% identical lines"
                )
    return 0


if __name__ == "__main__":
    sys.exit(main())
