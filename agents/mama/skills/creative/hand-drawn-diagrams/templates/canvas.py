"""Starter for a hand-drawn (Excalidraw-style) SVG diagram.

Copy this file beside the work, keep Canvas, replace demo() with one function
per diagram, then:

    python3 canvas.py && rsvg-convert -z 2 -o demo.png demo.svg

The SVG is the source; the PNG is what the operator reads in chat. Kalam must
be installed for fontconfig, because rsvg ignores @font-face data URIs; the
HTML wrapper embeds it anyway so the file still travels to a machine that has
the font missing.
"""

import base64
import math
import os

INK, MUT, PAPER = "#1e1e1e", "#5f6368", "#fffdf9"
BLUE = ("#a5d8ff", "#1971c2")
GREEN = ("#b2f2bb", "#2f9e44")
YELL = ("#ffec99", "#e67700")
RED = ("#ffc9c9", "#e03131")
ROSE = "#ffe3e3"
PURP = ("#d0bfff", "#7048e8")
ORNG = ("#ffd8a8", "#e8590c")
GREY = ("#e9ecef", "#868e96")

W, H = 1500, 1200

FILTERS = """
<filter id="r1" x="-15%" y="-15%" width="130%" height="130%">
  <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="3" seed="7" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="r2" x="-15%" y="-15%" width="130%" height="130%">
  <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="3" seed="23" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="r3" x="-15%" y="-15%" width="130%" height="130%">
  <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="3" seed="41" result="n"/>
  <feDisplacementMap in="SourceGraphic" in2="n" scale="3" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
  <circle cx="2" cy="2" r="0.9" fill="#1e1e1e" opacity="0.07"/>
</pattern>
"""


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class Canvas:
    def __init__(self, w=W, h=H):
        self.w, self.h = w, h
        self.body = []
        self.n = 0

    def add(self, s):
        self.body.append(s)

    def filt(self):
        self.n += 1
        return f"r{1 + (self.n % 3)}"

    # ---- text (never filtered) -------------------------------------------
    def text(self, x, y, s, size=13, fill=INK, bold=False, anchor="start",
             opacity=1.0, spacing=None):
        a = f'x="{x}" y="{y}" font-family="Kalam" font-size="{size}" fill="{fill}"'
        if bold:
            a += ' font-weight="bold"'
        if anchor != "start":
            a += f' text-anchor="{anchor}"'
        if opacity != 1.0:
            a += f' opacity="{opacity}"'
        if spacing:
            a += f' letter-spacing="{spacing}"'
        self.add(f"<text {a}>{esc(s)}</text>")

    def lines(self, x, y, rows, size=11.5, lead=None, **kw):
        lead = lead or size * 1.55
        for i, r in enumerate(rows):
            self.text(x, y + i * lead, r, size=size, **kw)

    # ---- shapes (filtered) ------------------------------------------------
    def rect(self, x, y, w, h, fill="#ffffff", stroke=INK, rx=7, dash=None,
             sw=1.9, double=True):
        f = self.filt()
        d = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(f'<g filter="url(#{f})"><rect x="{x}" y="{y}" width="{w}" '
                 f'height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" '
                 f'stroke-width="{sw}"{d}/></g>')
        if double:
            f2 = self.filt()
            self.add(f'<g filter="url(#{f2})" opacity="0.45"><rect x="{x + 1.2}" '
                     f'y="{y + 1.4}" width="{w}" height="{h}" rx="{rx}" fill="none" '
                     f'stroke="{stroke}" stroke-width="1"{d}/></g>')

    def arrow(self, pts, color=INK, dash=None, head=True, sw=1.7, curve=2.0, bow=None):
        """pts: (x, y) pairs. A two-point line gets a slight bow so it looks drawn."""
        pts = [tuple(map(float, p)) for p in pts]
        if len(pts) == 2 and curve:
            (x1, y1), (x2, y2) = pts
            dx, dy = x2 - x1, y2 - y1
            L = math.hypot(dx, dy) or 1
            off = bow if bow is not None else (curve if L > 60 else curve * 0.4)
            mx, my = (x1 + x2) / 2 - dy / L * off, (y1 + y2) / 2 + dx / L * off
            d = f"M {x1:.1f} {y1:.1f} Q {mx:.1f} {my:.1f} {x2:.1f} {y2:.1f}"
            tail = (mx, my)
        else:
            d = f"M {pts[0][0]:.1f} {pts[0][1]:.1f}"
            for i in range(1, len(pts) - 1):
                mx = (pts[i][0] + pts[i + 1][0]) / 2
                my = (pts[i][1] + pts[i + 1][1]) / 2
                d += f" Q {pts[i][0]:.1f} {pts[i][1]:.1f} {mx:.1f} {my:.1f}"
            d += f" L {pts[-1][0]:.1f} {pts[-1][1]:.1f}"
            tail = pts[-2]
        f = self.filt()
        dd = f' stroke-dasharray="{dash}"' if dash else ""
        self.add(f'<g filter="url(#{f})"><path d="{d}" fill="none" stroke="{color}" '
                 f'stroke-width="{sw}" stroke-linecap="round"{dd}/>')
        if head:
            (x1, y1), (x2, y2) = tail, pts[-1]
            a = math.atan2(y2 - y1, x2 - x1)
            for s in (0.42, -0.42):
                hx, hy = x2 - 11 * math.cos(a + s), y2 - 11 * math.sin(a + s)
                self.add(f'<path d="M {hx:.1f} {hy:.1f} L {x2:.1f} {y2:.1f}" fill="none" '
                         f'stroke="{color}" stroke-width="{sw}" stroke-linecap="round"/>')
        self.add("</g>")

    def badge(self, x, y, n, color=RED[1]):
        self.add(f'<circle cx="{x}" cy="{y}" r="11" fill="{color}" opacity="0.92"/>')
        self.text(x, y + 5, str(n), size=12.5, fill="#ffffff", bold=True, anchor="middle")

    def note(self, x, y, w, h, title, rows, color=YELL, badge=None, size=11.4,
             lead=None, rot=-0.7):
        """Sized to its text: 5 lines at 11.4 px wants about 130 px of body."""
        self.add(f'<g transform="rotate({rot} {x + w / 2} {y + h / 2})">')
        self.rect(x, y, w, h, fill=color[0], stroke=color[1], rx=4, sw=1.7)
        self.text(x + 14, y + 26, title, size=12.6, bold=True)
        self.lines(x + 14, y + 50, rows, size=size, lead=lead or size * 1.42)
        self.add("</g>")
        if badge:
            self.badge(x - 6, y - 6, badge)

    def svg(self):
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" '
                f'height="{self.h}" viewBox="0 0 {self.w} {self.h}">\n'
                f'<defs>{FILTERS}</defs>\n'
                f'<rect width="{self.w}" height="{self.h}" fill="{PAPER}"/>\n'
                f'<rect width="{self.w}" height="{self.h}" fill="url(#dots)"/>\n'
                + "\n".join(self.body) + "\n</svg>")


HTML = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>{title}</title>
<style>
@font-face {{ font-family: 'Kalam'; font-style: normal; font-weight: 400;
  src: url(data:font/ttf;base64,{reg}) format('truetype'); }}
@font-face {{ font-family: 'Kalam'; font-style: normal; font-weight: 700;
  src: url(data:font/ttf;base64,{bold}) format('truetype'); }}
html, body {{ margin: 0; padding: 0; background: #f1efe9; }}
body {{ display: flex; justify-content: center; padding: 28px 20px 36px; }}
svg {{ max-width: 100%; height: auto; border-radius: 10px;
  box-shadow: 0 12px 44px rgba(30,30,30,.16); }}
</style></head>
<body>
{svg}
</body></html>
"""


def save(canvas, name, title, outdir="."):
    """Write <name>.svg and <name>.html; fonts are optional so it runs anywhere."""
    svg = canvas.svg()
    with open(os.path.join(outdir, name + ".svg"), "w") as fh:
        fh.write(svg)
    reg = bold = ""
    for key, path in (("reg", "Kalam-Regular.ttf"), ("bold", "Kalam-Bold.ttf")):
        p = os.path.expanduser("~/.fonts/" + path)
        if os.path.exists(p):
            b = base64.b64encode(open(p, "rb").read()).decode()
            if key == "reg":
                reg = b
            else:
                bold = b
    with open(os.path.join(outdir, name + ".html"), "w") as fh:
        fh.write(HTML.format(title=esc(title), reg=reg, bold=bold, svg=svg))
    print(name, len(svg), "bytes svg")


def demo():
    """Replace with the real diagram. Title, one external box, one process box,
    one arrow, one sticky note — the minimum that shows the style is working."""
    c = Canvas()
    c.text(40, 58, "A hand-drawn diagram", size=31, bold=True)
    c.text(40, 88, "subtitle: the ref, the size, the version", size=13.5, fill=MUT)

    c.rect(40, 180, 250, 160, fill=BLUE[0], stroke=BLUE[1])
    c.text(56, 212, "External", size=19, bold=True)
    c.text(56, 236, "what sends the events", size=11.2, fill=MUT)
    c.text(56, 268, "identifier · number", size=12.2, fill="#0b4a6f")

    c.arrow([(290, 260), (480, 260)], curve=1.6)
    c.text(300, 250, "HTTPS", size=9.8, fill=MUT)

    c.rect(480, 150, 480, 300, fill="#ffffff", stroke=GREY[1], rx=14, dash="9 7", sw=1.6)
    c.text(498, 178, "the process", size=12.8, bold=True, fill=MUT)
    c.rect(500, 200, 440, 110, fill="#ffffff", stroke=INK)
    c.text(516, 228, "package/name.go · 000 lines", size=14.5, bold=True)
    c.text(516, 252, "what it owns, in identifiers", size=11.8)
    c.text(516, 272, "ten flows · three caps", size=11.8)

    c.note(1000, 180, 300, 130, "a finding", [
        "one rule per note,",
        "five lines at most.",
    ])
    save(c, "demo", "A hand-drawn diagram")


if __name__ == "__main__":
    demo()
