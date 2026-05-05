#!/usr/bin/env python3
"""
Slice BakedGoodsGrid New.png into named RGBA tiles.

Sprites may bleed slightly past the nominal 256×256 grid. For each cell we take the
largest alpha-connected region inside the cell as seeds, flood outward through the
same alpha threshold into a sheet patch that includes SHEET_BLEED margin (possibly
spanning neighbors), mask everything else transparent, dilate the mask slightly,
then crop with an outer transparent gutter.

Grid: 6×4 cells @ 256×256px.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHEET = ROOT / "public/sprites/source/BakedGoodsGrid New.png"
OUT_DIR = ROOT / "public/sprites/baked_goods"
FAVICON_SRC = ROOT / "public/sprites/source/favicon update.png"
FAVICON_OUT = ROOT / "public/favicon.png"

BAKED_GOOD_NAMES = [
    "baguette",
    "croissant",
    "macaron",
    "tarte_aux_fruits",
    "pain_au_chocolat",
    "eclair",
    "sourdough_loaf",
    "cornbread",
    "buttermilk_biscuit",
    "apple_pie",
    "molasses_cookie",
    "cinnamon_roll",
    "mooncake",
    "mantou_bun",
    "tangyuan",
    "sesame_ball",
    "egg_tart",
    "red_bean_bun",
    "scone",
    "crumpet",
    "meat_pie",
    "victoria_sponge",
    "shortbread",
    "chelsea_bun",
]

COLS = 6
ROWS = 4
CELL = 256

ALPHA_CC = 8

MIN_SPRITE_AREA = 800

BBOX_EXPAND = 6

# Pull pixels from neighboring cells when art crosses grid lines.
SHEET_BLEED = 96

# Widen the kept mask so soft rims survive masking / bbox.
MASK_DILATE = 11

# Transparent gutter around final bbox crop.
OUTER_PAD = 28

# Crop bbox includes pixels whose alpha exceeds this after masking.
CROP_ALPHA_MIN = 6

EDGE_ALPHA_MAX = 12


def _idx(w: int, x: int, y: int) -> int:
    return y * w + x


def largest_connected_mask(mask_fg: bytes, w: int, h: int) -> tuple[int, bytearray]:
    visited = bytearray(w * h)
    best_area = 0
    best = bytearray(w * h)

    for y in range(h):
        for x in range(w):
            si = _idx(w, x, y)
            if visited[si] or mask_fg[si] == 0:
                continue

            q: deque[tuple[int, int]] = deque([(x, y)])
            visited[si] = 1
            local = bytearray(w * h)
            local[si] = 255
            area = 1

            while q:
                cx, cy = q.popleft()
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    ni = _idx(w, nx, ny)
                    if visited[ni] or mask_fg[ni] == 0:
                        continue
                    visited[ni] = 1
                    local[ni] = 255
                    area += 1
                    q.append((nx, ny))

            if area > best_area:
                best_area = area
                best = local

    return best_area, best


def bbox_alpha(im_rgba: Image.Image, alpha_min: int) -> tuple[int, int, int, int] | None:
    w, h = im_rgba.size
    ap = im_rgba.split()[3].load()
    minx = miny = 10**9
    maxx = maxy = -1
    found = False
    for y in range(h):
        for x in range(w):
            if ap[x, y] <= alpha_min:
                continue
            found = True
            minx = min(minx, x)
            maxx = max(maxx, x)
            miny = min(miny, y)
            maxy = max(maxy, y)
    if not found:
        return None
    return (minx, miny, maxx, maxy)


def flood_from_seeds(patch: Image.Image, seeds: list[tuple[int, int]], alpha_thr: int) -> bytearray:
    """4-connected reachability through pixels with alpha > alpha_thr."""
    w, h = patch.size
    ap = patch.split()[3].load()
    kept = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    for x, y in seeds:
        if x < 0 or y < 0 or x >= w or y >= h:
            continue
        if ap[x, y] <= alpha_thr:
            continue
        i = _idx(w, x, y)
        if kept[i]:
            continue
        kept[i] = 1
        q.append((x, y))

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if nx < 0 or ny < 0 or nx >= w or ny >= h:
                continue
            ni = _idx(w, nx, ny)
            if kept[ni] or ap[nx, ny] <= alpha_thr:
                continue
            kept[ni] = 1
            q.append((nx, ny))

    return kept


def apply_mask_l(rgba: Image.Image, mask_l: Image.Image) -> Image.Image:
    r, g, b, a = rgba.split()
    new_a = ImageChops.multiply(a, mask_l)
    return Image.merge("RGBA", (r, g, b, new_a))


def max_edge_alpha(tile: Image.Image) -> int:
    w, h = tile.size
    if w == 0 or h == 0:
        return 255
    ap = tile.split()[3].load()
    m = 0
    for x in range(w):
        m = max(m, ap[x, 0], ap[x, h - 1])
    for y in range(h):
        m = max(m, ap[0, y], ap[w - 1, y])
    return m


def slice_sheet() -> None:
    sheet = Image.open(SOURCE_SHEET).convert("RGBA")
    sw, sh = sheet.size
    assert sw == COLS * CELL and sh == ROWS * CELL, f"Unexpected sheet size {sw}x{sh}"
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    name_i = 0
    for cy in range(ROWS):
        for cx in range(COLS):
            name = BAKED_GOOD_NAMES[name_i]
            name_i += 1

            abs_x0 = cx * CELL
            abs_y0 = cy * CELL
            cell = sheet.crop((abs_x0, abs_y0, abs_x0 + CELL, abs_y0 + CELL))
            cw, ch = cell.size

            ap_cell = cell.split()[3].load()
            cand = bytearray(cw * ch)
            for y in range(ch):
                for x in range(cw):
                    if ap_cell[x, y] > ALPHA_CC:
                        cand[_idx(cw, x, y)] = 255

            area, cc_mask = largest_connected_mask(bytes(cand), cw, ch)
            if area < MIN_SPRITE_AREA:
                raise RuntimeError(f"No/little foreground for {name} (cc_area={area})")

            box = bbox_nonzero_impl(bytes(cc_mask), cw, ch)
            assert box is not None
            bminx, bminy, bmaxx, bmaxy = box

            gx0 = max(0, abs_x0 + bminx - BBOX_EXPAND - SHEET_BLEED)
            gy0 = max(0, abs_y0 + bminy - BBOX_EXPAND - SHEET_BLEED)
            gx1 = min(sw - 1, abs_x0 + bmaxx + BBOX_EXPAND + SHEET_BLEED)
            gy1 = min(sh - 1, abs_y0 + bmaxy + BBOX_EXPAND + SHEET_BLEED)

            patch = sheet.crop((gx0, gy0, gx1 + 1, gy1 + 1)).copy()
            pw, ph = patch.size

            ox = abs_x0 - gx0
            oy = abs_y0 - gy0

            seeds: list[tuple[int, int]] = []
            for y in range(ch):
                for x in range(cw):
                    if cc_mask[_idx(cw, x, y)] == 0:
                        continue
                    seeds.append((ox + x, oy + y))

            kept = flood_from_seeds(patch, seeds, ALPHA_CC)
            mask_raw = bytes(v * 255 for v in kept)
            mask_im = Image.frombytes("L", (pw, ph), mask_raw)
            dilated = mask_im.filter(ImageFilter.MaxFilter(MASK_DILATE))

            masked = apply_mask_l(patch, dilated)

            crop_box = bbox_alpha(masked, CROP_ALPHA_MIN)
            if crop_box is None:
                raise RuntimeError(f"{name}: empty after masking")

            cx0, cy0, cx1, cy1 = crop_box
            crop = masked.crop((cx0, cy0, cx1 + 1, cy1 + 1))

            tw = crop.width + 2 * OUTER_PAD
            th = crop.height + 2 * OUTER_PAD
            tile = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
            tile.paste(crop, (OUTER_PAD, OUTER_PAD))

            edge_max = max_edge_alpha(tile)
            if edge_max > EDGE_ALPHA_MAX:
                raise RuntimeError(
                    f"{name}: edge alpha max={edge_max} > {EDGE_ALPHA_MAX}; "
                    "raise SHEET_BLEED / OUTER_PAD or inspect sheet bleed."
                )

            out_path = OUT_DIR / f"{name}.png"
            tile.save(out_path, optimize=True)
            print(out_path.relative_to(ROOT), tile.size)


def bbox_nonzero_impl(mask: bytes, w: int, h: int) -> tuple[int, int, int, int] | None:
    minx = miny = 10**9
    maxx = maxy = -1
    found = False
    for y in range(h):
        for x in range(w):
            if mask[_idx(w, x, y)] == 0:
                continue
            found = True
            minx = min(minx, x)
            maxx = max(maxx, x)
            miny = min(miny, y)
            maxy = max(maxy, y)
    if not found:
        return None
    return (minx, miny, maxx, maxy)


def make_favicon() -> None:
    im = Image.open(FAVICON_SRC)
    if im.mode not in ("RGBA", "RGB"):
        im = im.convert("RGBA")
    w, h = im.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    sq = im.crop((left, top, left + side, top + side))
    sq = sq.resize((64, 64), Image.Resampling.LANCZOS)
    if sq.mode == "RGBA":
        bg = Image.new("RGB", sq.size, (255, 251, 235))
        bg.paste(sq, mask=sq.split()[3])
        sq = bg
    else:
        sq = sq.convert("RGB")
    sq.save(FAVICON_OUT, optimize=True)
    print(FAVICON_OUT.relative_to(ROOT), sq.size)


def main() -> None:
    slice_sheet()
    make_favicon()


if __name__ == "__main__":
    main()
