#!/usr/bin/env python3
import subprocess
from pathlib import Path

ASSETS = Path("/Users/jessedelgadillo/.cursor/projects/Users-jessedelgadillo-Projects/assets")
ROOT = Path(__file__).resolve().parents[1]
PROC = ROOT / "scripts" / "process-apartment-ai-sprite.py"

JOBS = [
    ("paris_wall_clock.png", "paris", "wall_decor", "wall_clock"),
    ("paris_framed_art.png", "paris", "wall_decor", "framed_art"),
    ("paris_wall_shelf.png", "paris", "wall_decor", "wall_shelf"),
    ("paris_dining_table.png", "paris", "tables", "dining_table"),
    ("paris_side_table.png", "paris", "tables", "side_table"),
    ("paris_stove.png", "paris", "kitchen", "stove"),
    ("paris_coffee_maker.png", "paris", "kitchen", "coffee_maker"),
    ("paris_kitchen_sink.png", "paris", "kitchen", "kitchen_sink"),
    ("paris_rug_round.png", "paris", "carpets", "rug_round"),
    ("paris_rug_runner.png", "paris", "carpets", "rug_runner"),
]

for fname, loc, cat, item in JOBS:
    src = ASSETS / fname
    if not src.exists():
        print("skip missing", fname)
        continue
    subprocess.run(["python3", str(PROC), str(src), loc, cat, item], check=True)
