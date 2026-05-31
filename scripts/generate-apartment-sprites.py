#!/usr/bin/env python3
"""
Generate Cakery Bakery apartment prop sprites per locale.
Style: Gojito storybook arcade + Cakery warm bakery palette (see docs/styleguide).
Output: public/sprites/apartment/{locale}/{category}/{id}.png
"""

from __future__ import annotations

import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "sprites" / "apartment"
CATALOG = OUT / "catalog.json"

# Locale palettes — cream/cinnamon/wood + era accent (Gojito + Cakery guides)
PALETTES = {
    "paris": {
        "wall": (255, 244, 235),
        "wood": (139, 94, 60),
        "wood_dark": (92, 58, 36),
        "accent": (196, 72, 98),
        "metal": (180, 150, 90),
        "fabric": (245, 210, 220),
        "highlight": (255, 252, 245),
        "outline": (62, 42, 32),
    },
    "london": {
        "wall": (242, 238, 228),
        "wood": (101, 78, 58),
        "wood_dark": (68, 52, 42),
        "accent": (72, 98, 128),
        "metal": (140, 145, 150),
        "fabric": (178, 58, 68),
        "highlight": (250, 248, 242),
        "outline": (40, 38, 36),
    },
    "ming_china": {
        "wall": (250, 242, 228),
        "wood": (120, 82, 52),
        "wood_dark": (78, 50, 32),
        "accent": (178, 48, 42),
        "metal": (160, 130, 70),
        "fabric": (220, 200, 160),
        "highlight": (255, 250, 240),
        "outline": (48, 32, 28),
    },
    "frontier_us": {
        "wall": (248, 236, 210),
        "wood": (118, 78, 48),
        "wood_dark": (82, 52, 30),
        "accent": (168, 98, 48),
        "metal": (110, 105, 98),
        "fabric": (210, 185, 150),
        "highlight": (255, 248, 232),
        "outline": (50, 38, 28),
    },
}

CATEGORY_SIZE = {
    "furniture": (280, 200),
    "wall_decor": (180, 200),
    "tables": (260, 170),
    "kitchen": (220, 220),
    "carpets": (300, 130),
}


def lerp(a: int, b: int, t: float) -> int:
    return int(a + (b - a) * t)


def blend(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(lerp(c1[i], c2[i], t) for i in range(3))


def add_noise(img: Image.Image, amount: int = 12) -> Image.Image:
    px = img.load()
    w, h = img.size
    rng = random.Random(42)
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            n = rng.randint(-amount, amount)
            px[x, y] = (
                max(0, min(255, r + n)),
                max(0, min(255, g + n)),
                max(0, min(255, b + n)),
                a,
            )
    return img


def stroke_outline(draw: ImageDraw.ImageDraw, pts, outline, width=3, fill=None):
    if fill:
        draw.polygon(pts, fill=fill, outline=outline, width=width)
    else:
        draw.line(pts + [pts[0]], fill=outline, width=width)


def draw_rounded_rect(draw, box, radius, fill, outline, width=3):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def draw_bed(draw, w, h, pal, upgrade: bool):
    ox, oy = 24, h - 48
    bw, bh = w - 48, 72
    draw_rounded_rect(draw, (ox, oy, ox + bw, oy + bh), 14, pal["wood"], pal["outline"])
    draw_rounded_rect(draw, (ox + 8, oy - 28, ox + bw - 8, oy + 12), 10, pal["fabric"], pal["outline"])
    if upgrade:
        draw_rounded_rect(draw, (ox + bw - 50, oy - 42, ox + bw, oy + 8), 8, pal["accent"], pal["outline"])
        for i in range(3):
            draw.ellipse((ox + 20 + i * 36, oy + 18, ox + 44 + i * 36, oy + 42), fill=pal["highlight"], outline=pal["outline"], width=2)
    draw_rounded_rect(draw, (ox + 12, oy + 14, ox + bw - 12, oy + bh - 10), 8, pal["highlight"], pal["outline"])


def draw_dresser(draw, w, h, pal):
    cx = w // 2
    draw_rounded_rect(draw, (cx - 70, h - 100, cx + 70, h - 20), 10, pal["wood"], pal["outline"])
    for row in range(3):
        y0 = h - 92 + row * 24
        draw_rounded_rect(draw, (cx - 58, y0, cx + 58, y0 + 18), 4, pal["wood_dark"], pal["outline"])
        draw.ellipse((cx - 48, y0 + 7, cx - 38, y0 + 17), fill=pal["metal"], outline=pal["outline"], width=1)


def draw_armchair(draw, w, h, pal):
    cx = w // 2
    draw_rounded_rect(draw, (cx - 55, h - 75, cx + 55, h - 28), 16, pal["fabric"], pal["outline"])
    draw_rounded_rect(draw, (cx - 62, h - 115, cx + 62, h - 70), 14, pal["accent"], pal["outline"])
    draw_rounded_rect(draw, (cx - 48, h - 28, cx + 48, h - 12), 6, pal["wood_dark"], pal["outline"])


def draw_wall_clock(draw, w, h, pal):
    cx, cy = w // 2, h // 2 + 10
    r = 58
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=pal["wall"], outline=pal["outline"], width=4)
    draw.ellipse((cx - r + 12, cy - r + 12, cx + r - 12, cy + r - 12), fill=pal["highlight"], outline=pal["outline"], width=2)
    draw.line((cx, cy, cx, cy - 28), fill=pal["outline"], width=3)
    draw.line((cx, cy, cx + 22, cy + 6), fill=pal["outline"], width=2)


def draw_framed_art(draw, w, h, pal):
    draw_rounded_rect(draw, (28, 36, w - 28, h - 36), 8, pal["metal"], pal["outline"], width=4)
    draw_rounded_rect(draw, (44, 52, w - 44, h - 52), 6, pal["accent"], pal["outline"])
    draw.ellipse((w // 2 - 30, h // 2 - 20, w // 2 + 30, h // 2 + 30), fill=pal["fabric"], outline=pal["outline"], width=2)


def draw_wall_shelf(draw, w, h, pal):
    draw_rounded_rect(draw, (20, h // 2 - 8, w - 20, h // 2 + 8), 4, pal["wood"], pal["outline"])
    for i, y in enumerate([h // 2 - 50, h // 2 + 24]):
        draw_rounded_rect(draw, (36, y, w - 36, y + 10), 3, pal["wood_dark"], pal["outline"])
        draw.ellipse((52, y - 22, 78, y + 2), fill=pal["accent"], outline=pal["outline"], width=2)
        draw_rounded_rect(draw, (w - 90, y - 18, w - 58, y + 2), 4, pal["highlight"], pal["outline"])


def draw_dining_table(draw, w, h, pal):
    cx = w // 2
    draw_rounded_rect(draw, (cx - 90, h - 95, cx + 90, h - 75), 20, pal["wood"], pal["outline"])
    for leg in (-70, 70):
        draw_rounded_rect(draw, (cx + leg - 8, h - 75, cx + leg + 8, h - 18), 4, pal["wood_dark"], pal["outline"])
    draw.ellipse((cx - 95, h - 115, cx + 95, h - 88), fill=pal["fabric"], outline=pal["outline"], width=3)


def draw_side_table(draw, w, h, pal):
    cx = w // 2
    draw_rounded_rect(draw, (cx - 55, h - 88, cx + 55, h - 72), 12, pal["wood"], pal["outline"])
    draw_rounded_rect(draw, (cx - 10, h - 72, cx + 10, h - 22), 4, pal["wood_dark"], pal["outline"])
    draw.ellipse((cx - 40, h - 105, cx + 40, h - 82), fill=pal["highlight"], outline=pal["outline"], width=2)


def draw_stove(draw, w, h, pal):
    draw_rounded_rect(draw, (40, 50, w - 40, h - 30), 12, pal["metal"], pal["outline"])
    draw_rounded_rect(draw, (56, 66, w - 56, h - 100), 8, pal["wood_dark"], pal["outline"])
    for i, bx in enumerate([70, 120, 170]):
        draw.ellipse((bx, 80, bx + 36, 116), fill=pal["outline"], outline=pal["outline"])
        draw.ellipse((bx + 6, 86, bx + 30, 110), fill=pal["accent"], outline=pal["outline"], width=2)


def draw_coffee_maker(draw, w, h, pal):
    cx = w // 2
    draw_rounded_rect(draw, (cx - 45, h - 120, cx + 45, h - 40), 10, pal["metal"], pal["outline"])
    draw_rounded_rect(draw, (cx - 30, h - 155, cx + 30, h - 118), 8, pal["wood"], pal["outline"])
    draw_rounded_rect(draw, (cx - 18, h - 70, cx + 18, h - 35), 6, pal["accent"], pal["outline"])


def draw_kitchen_sink(draw, w, h, pal):
    draw_rounded_rect(draw, (36, 70, w - 36, h - 40), 10, pal["metal"], pal["outline"])
    draw_rounded_rect(draw, (52, 86, w - 52, h - 70), 14, pal["highlight"], pal["outline"])
    draw.ellipse((w // 2 - 18, 100, w // 2 + 18, 130), fill=pal["accent"], outline=pal["outline"], width=2)


def draw_rug_round(draw, w, h, pal):
    cx, cy = w // 2, h // 2 + 10
    draw.ellipse((cx - 120, cy - 50, cx + 120, cy + 50), fill=pal["fabric"], outline=pal["outline"], width=4)
    draw.ellipse((cx - 80, cy - 28, cx + 80, cy + 28), fill=pal["accent"], outline=pal["outline"], width=2)


def draw_rug_runner(draw, w, h, pal):
    draw_rounded_rect(draw, (30, h // 2 - 35, w - 30, h // 2 + 35), 18, pal["fabric"], pal["outline"], width=4)
    for x in range(50, w - 50, 40):
        draw.line((x, h // 2 - 20, x, h // 2 + 20), fill=pal["accent"], width=3)


DRAWERS = {
    "bed_basic": lambda d, w, h, p: draw_bed(d, w, h, p, False),
    "bed_upgrade": lambda d, w, h, p: draw_bed(d, w, h, p, True),
    "dresser": draw_dresser,
    "armchair": draw_armchair,
    "wall_clock": draw_wall_clock,
    "framed_art": draw_framed_art,
    "wall_shelf": draw_wall_shelf,
    "dining_table": draw_dining_table,
    "side_table": draw_side_table,
    "stove": draw_stove,
    "coffee_maker": draw_coffee_maker,
    "kitchen_sink": draw_kitchen_sink,
    "rug_round": draw_rug_round,
    "rug_runner": draw_rug_runner,
}


def render_sprite(locale: str, category: str, item_id: str) -> Path:
    pal = PALETTES[locale]
    w, h = CATEGORY_SIZE[category]
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    drawer = DRAWERS[item_id]
    drawer(draw, w, h, pal)
    img = add_noise(img, 10)
    img = img.filter(ImageFilter.GaussianBlur(radius=0.4))
    dest = OUT / locale / category / f"{item_id}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG", optimize=True)
    return dest


def render_background(locale: str) -> Path:
    """Painterly empty room — locale palette, 768×512."""
    pal = PALETTES[locale]
    w, h = 768, 512
    img = Image.new("RGB", (w, h), pal["wall"])
    draw = ImageDraw.Draw(img)

    # Floor (warm wood planks)
    for i in range(0, w, 48):
        shade = blend(pal["wood"], pal["wood_dark"], (i % 96) / 96)
        draw.rectangle((i, h * 0.62, i + 48, h), fill=shade)
    draw.line((0, int(h * 0.62), w, int(h * 0.62)), fill=pal["outline"], width=3)

    # Back wall wainscoting
    draw.rectangle((0, 0, w, int(h * 0.62)), fill=pal["wall"])
    draw.rectangle((0, int(h * 0.42), w, int(h * 0.62)), fill=blend(pal["wall"], pal["fabric"], 0.35))
    draw.line((0, int(h * 0.42), w, int(h * 0.42)), fill=pal["outline"], width=2)

    # Window (locale accent frame)
    wx0, wy0, wx1, wy1 = 180, 40, w - 180, int(h * 0.55)
    draw.rounded_rectangle((wx0, wy0, wx1, wy1), radius=12, fill=blend(pal["highlight"], (200, 220, 240), 0.5), outline=pal["outline"], width=4)
    draw.rounded_rectangle((wx0 + 16, wy0 + 16, wx1 - 16, wy1 - 16), radius=8, fill=(220, 235, 250), outline=pal["wood"], width=3)
    # Curtains
    draw.rectangle((wx0 - 28, wy0, wx0, wy1), fill=pal["fabric"], outline=pal["outline"], width=2)
    draw.rectangle((wx1, wy0, wx1 + 28, wy1), fill=pal["fabric"], outline=pal["outline"], width=2)

    # Locale skyline hint
    accent_bar = {
        "paris": "Eiffel silhouette warm cream sky",
        "london": "chimney rooftops soft fog",
        "ming_china": "curved rooflines canal mist",
        "frontier_us": "prairie horizon wooden town",
    }
    _ = accent_bar.get(locale)
    sky_y = wy0 + 40
    for i in range(8):
        bh = 30 + (i * 17) % 55
        bx = wx0 + 30 + i * ((wx1 - wx0 - 60) // 8)
        draw.rectangle((bx, sky_y + 80 - bh, bx + 36, sky_y + 80), fill=blend(pal["wood_dark"], pal["accent"], 0.25))

    # Empty placement zones (subtle floor markers for game slots)
    slots = [(120, h - 140, 260, h - 50), (w - 260, h - 140, w - 120, h - 50), (w // 2 - 70, h - 100, w // 2 + 70, h - 40)]
    for box in slots:
        draw.rounded_rectangle(box, radius=10, outline=blend(pal["outline"], pal["wall"], 0.7), width=1)

    img = img.convert("RGBA")
    img = add_noise(img, 8)
    dest = OUT / "backgrounds" / f"{locale}_empty.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "PNG", optimize=True)
    return dest


def main():
    catalog = json.loads(CATALOG.read_text())
    locales = catalog["locales"]
    items = catalog["items"]
    count = 0
    for locale in locales:
        render_background(locale)
        count += 1
        for category, ids in items.items():
            for item_id in ids:
                render_sprite(locale, category, item_id)
                count += 1
    print(f"Wrote {count} apartment assets under {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
