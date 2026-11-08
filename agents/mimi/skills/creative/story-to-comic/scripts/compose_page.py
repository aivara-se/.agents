#!/usr/bin/env python3
"""Compose a comic page from a JSON spec: art panels, captions, speech bubbles.

Art is generated elsewhere (image model). This renderer owns the parts image
models are bad at: panel borders, gutters, lettering and balloon placement.

Usage: python3 compose_page.py page.json out.png

Spec:
  page: {width_in, height_in, dpi, margin_in, gutter_in, background}
  panels[]: {box: [x, y, w, h] (fractions of the inner page), image, caption,
             dialogue: [{text, at: [x, y], tail: [x, y], width, scale}]}
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"


def cover(img: Image.Image, w: int, h: int) -> Image.Image:
    """Scale and centre-crop to fill w x h."""
    scale = max(w / img.width, h / img.height)
    img = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
    left = (img.width - w) // 2
    top = (img.height - h) // 2
    return img.crop((left, top, left + w, top + h))


def wrap(draw, text, font, max_w):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if draw.textlength(trial, font=font) <= max_w or not line:
            line = trial
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def text_block(draw, text, font, max_w, spacing):
    lines = wrap(draw, text, font, max_w)
    box = draw.multiline_textbbox((0, 0), "\n".join(lines), font=font, spacing=spacing)
    return lines, box[2] - box[0], box[3] - box[1]


def draw_caption(draw, panel, text, font_size, pad):
    """Draw the caption box and return its bottom edge, used as a balloon floor."""
    x, y, w, h = panel
    max_w = int(w * 0.86)
    size = font_size
    while size > 10:
        font = ImageFont.truetype(FONT_SERIF, size)
        lines, tw, th = text_block(draw, text, font, max_w - 2 * pad, int(size * 0.25))
        if th + 2 * pad < h * 0.45:
            break
        size -= 1
    bx, by = x + int(w * 0.03), y + int(h * 0.03)
    draw.rectangle([bx, by, bx + tw + 2 * pad, by + th + 2 * pad], fill="#FFF3B0",
                   outline="#000000", width=max(2, size // 8))
    draw.multiline_text((bx + pad, by + pad), "\n".join(lines), font=font, fill="#000000",
                        spacing=int(size * 0.25))
    return by + th + 2 * pad


def draw_bubble(draw, panel, item, base_size, floor=None):
    x, y, w, h = panel
    cx = x + item["at"][0] * w
    cy = y + item["at"][1] * h
    max_w = int(w * item.get("width", 0.62))
    pad = max(8, base_size // 2)
    size = int(base_size * item.get("scale", 1.0))
    while size > 9:
        font = ImageFont.truetype(FONT_BOLD, size)
        lines, tw, th = text_block(draw, item["text"], font, max_w - 2 * pad, int(size * 0.22))
        bw, bh = tw + 2 * pad, th + 2 * pad
        bx = min(max(x + 4, cx - bw / 2), x + w - bw - 4)
        by = min(max(y + 4, cy - bh / 2), y + h - bh - 4)
        if floor:
            by = max(by, floor + pad)
        if by + bh < y + h - 4 and bx + bw < x + w - 4:
            break
        size -= 1

    tail = item.get("tail")
    if tail:
        tx, ty = x + tail[0] * w, y + tail[1] * h
        ax = min(max(tx, bx + bw * 0.2), bx + bw * 0.8)
        ay = by + bh if ty > by + bh / 2 else by
        spread = bh * 0.18
        draw.polygon([(ax - spread, ay), (ax + spread, ay), (tx, ty)],
                     fill="#FFFFFF", outline="#000000")

    radius = min(bh / 2, bw / 3)
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=radius, fill="#FFFFFF",
                           outline="#000000", width=max(2, size // 7))
    draw.multiline_text((bx + pad, by + pad), "\n".join(lines), font=font, fill="#000000",
                        spacing=int(size * 0.22), align="center")


def compose(spec_path: str, out_path: str) -> dict:
    spec = json.loads(Path(spec_path).read_text())
    page = spec["page"]
    W = round(page["width_in"] * page["dpi"])
    H = round(page["height_in"] * page["dpi"])
    margin = round(page.get("margin_in", 0.25) * page["dpi"])
    gutter = round(page.get("gutter_in", 0.12) * page["dpi"])
    canvas = Image.new("RGB", (W, H), page.get("background", "#FFFFFF"))
    draw = ImageDraw.Draw(canvas)

    inner_w, inner_h = W - 2 * margin, H - 2 * margin
    for panel in spec["panels"]:
        fx, fy, fw, fh = panel["box"]
        x = margin + round(fx * inner_w) + gutter // 2
        y = margin + round(fy * inner_h) + gutter // 2
        w = round(fw * inner_w) - gutter
        h = round(fh * inner_h) - gutter
        art = Image.open(panel["image"]).convert("RGB")
        canvas.paste(cover(art, w, h), (x, y))
        draw.rectangle([x, y, x + w, y + h], outline="#000000", width=max(3, round(page["dpi"] / 75)))
        floor = None
        if panel.get("caption"):
            floor = draw_caption(draw, (x, y, w, h), panel["caption"], int(w * 0.035), max(6, int(w * 0.012)))
        for item in panel.get("dialogue", []):
            draw_bubble(draw, (x, y, w, h), item, int(w * 0.045), floor)

    canvas.save(out_path, dpi=(page["dpi"], page["dpi"]))
    return {"out": out_path, "px": [W, H], "panels": len(spec["panels"])}


if __name__ == "__main__":
    print(json.dumps(compose(sys.argv[1], sys.argv[2])))
