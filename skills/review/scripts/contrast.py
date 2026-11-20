#!/usr/bin/env python3
"""Print the WCAG contrast ratio for colour pairs, and fail below the floor.

    python3 scripts/contrast.py '#6f7683' '#0f1019'
    python3 scripts/contrast.py 4.5 '#6f7683' '#0f1019' '#41735c' '#141522'

A pair is foreground then background. A first argument that is a number is the
floor, 4.5 by default. Exit 1 when any pair falls below it.
"""
import sys


def channel(value: int) -> float:
    c = value / 255
    return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hex_colour: str) -> float:
    h = hex_colour.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)


def ratio(fg: str, bg: str) -> float:
    a, b = luminance(fg), luminance(bg)
    hi, lo = max(a, b), min(a, b)
    return (hi + 0.05) / (lo + 0.05)


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__.strip())
        return 2
    floor = 4.5
    if argv[0].replace(".", "", 1).isdigit():
        floor = float(argv.pop(0))
    if len(argv) % 2:
        print("give colour pairs: foreground then background", file=sys.stderr)
        return 2
    failed = False
    for fg, bg in zip(argv[::2], argv[1::2]):
        value = ratio(fg, bg)
        ok = value >= floor
        failed = failed or not ok
        print(f"{fg} on {bg}: {value:.2f}:1 {'pass' if ok else 'FAIL'} (floor {floor})")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
