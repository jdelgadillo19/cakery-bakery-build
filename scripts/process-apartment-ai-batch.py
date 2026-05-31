#!/usr/bin/env python3
"""Process generated AI apartment sprites from Cursor assets folder."""

from __future__ import annotations

import subprocess
from pathlib import Path

ASSETS = Path("/Users/jessedelgadillo/.cursor/projects/Users-jessedelgadillo-Projects/assets")
ROOT = Path(__file__).resolve().parents[1]
PROC = ROOT / "scripts" / "process-apartment-ai-sprite.py"

JOBS: list[tuple[str, str, str, str]] = [
    # ming_china
    ("ming_china_bed_basic.png", "ming_china", "furniture", "bed_basic"),
    ("ming_china_bed_upgrade.png", "ming_china", "furniture", "bed_upgrade"),
    ("ming_china_dresser.png", "ming_china", "furniture", "dresser"),
    ("ming_china_armchair.png", "ming_china", "furniture", "armchair"),
    ("ming_china_wall_clock.png", "ming_china", "wall_decor", "wall_clock"),
    ("ming_china_framed_art.png", "ming_china", "wall_decor", "framed_art"),
    ("ming_china_wall_shelf.png", "ming_china", "wall_decor", "wall_shelf"),
    ("ming_china_dining_table.png", "ming_china", "tables", "dining_table"),
    ("ming_china_side_table.png", "ming_china", "tables", "side_table"),
    ("ming_china_stove.png", "ming_china", "kitchen", "stove"),
    ("ming_china_coffee_maker.png", "ming_china", "kitchen", "coffee_maker"),
    ("ming_china_kitchen_sink.png", "ming_china", "kitchen", "kitchen_sink"),
    ("ming_china_rug_round.png", "ming_china", "carpets", "rug_round"),
    ("ming_china_rug_runner.png", "ming_china", "carpets", "rug_runner"),
    # frontier_us
    ("frontier_us_bed_basic.png", "frontier_us", "furniture", "bed_basic"),
    ("frontier_us_bed_upgrade.png", "frontier_us", "furniture", "bed_upgrade"),
    ("frontier_us_dresser.png", "frontier_us", "furniture", "dresser"),
    ("frontier_us_armchair.png", "frontier_us", "furniture", "armchair"),
    ("frontier_us_wall_clock.png", "frontier_us", "wall_decor", "wall_clock"),
    ("frontier_us_framed_art.png", "frontier_us", "wall_decor", "framed_art"),
    ("frontier_us_wall_shelf.png", "frontier_us", "wall_decor", "wall_shelf"),
    ("frontier_us_dining_table.png", "frontier_us", "tables", "dining_table"),
    ("frontier_us_side_table.png", "frontier_us", "tables", "side_table"),
    ("frontier_us_stove.png", "frontier_us", "kitchen", "stove"),
    ("frontier_us_coffee_maker.png", "frontier_us", "kitchen", "coffee_maker"),
    ("frontier_us_kitchen_sink.png", "frontier_us", "kitchen", "kitchen_sink"),
    ("frontier_us_rug_round.png", "frontier_us", "carpets", "rug_round"),
    ("frontier_us_rug_runner.png", "frontier_us", "carpets", "rug_runner"),
]


def main():
    ok = 0
    for fname, loc, cat, item in JOBS:
        src = ASSETS / fname
        if not src.exists():
            print("missing", fname)
            continue
        subprocess.run(["python3", str(PROC), str(src), loc, cat, item], check=True)
        ok += 1
    print(f"processed {ok}/{len(JOBS)}")


if __name__ == "__main__":
    main()
