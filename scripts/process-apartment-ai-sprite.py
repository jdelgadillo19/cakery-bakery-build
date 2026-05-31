#!/usr/bin/env python3
"""Crop AI apartment sprites: black/near-black → transparent, resize to category box."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "sprites" / "apartment"

SIZES = {
    "furniture": (280, 200),
    "wall_decor": (180, 200),
    "tables": (260, 170),
    "kitchen": (220, 220),
    "carpets": (300, 130),
}


def key_to_rgb(px, threshold=28):
    r, g, b, a = px
    if a < 10:
        return True
    return r < threshold and g < threshold and b < threshold


def remove_black_bg(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            if key_to_rgb(px[x, y]):
                px[x, y] = (0, 0, 0, 0)
    return im


def trim_alpha(im: Image.Image, pad: int = 8) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def fit(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    tw, th = size
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    im.thumbnail((tw - 16, th - 16), Image.Resampling.LANCZOS)
    x = (tw - im.width) // 2
    y = th - im.height - 8
    canvas.paste(im, (x, y), im)
    return canvas


def process(src: Path, locale: str, category: str, item_id: str) -> Path:
    size = SIZES[category]
    im = Image.open(src)
    im = remove_black_bg(im)
    im = trim_alpha(im)
    im = fit(im, size)
    dest = OUT / locale / category / f"{item_id}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG", optimize=True)
    return dest


def main():
    if len(sys.argv) != 5:
        print("Usage: process-apartment-ai-sprite.py <src.png> <locale> <category> <item_id>")
        sys.exit(1)
    src, locale, category, item_id = sys.argv[1:5]
    dest = process(Path(src), locale, category, item_id)
    print(dest)


if __name__ == "__main__":
    main()
