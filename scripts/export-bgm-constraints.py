#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEV_PATH = ROOT / ".bgmLoopConstraints.dev.json"
SRC_PATH = ROOT / "src" / "data" / "bgmLoopConstraints.json"


def read_json(path: Path):
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main():
    src = read_json(SRC_PATH) or {"version": 1, "tracks": {}}
    dev = read_json(DEV_PATH)

    if not dev or not isinstance(dev.get("tracks"), dict):
        print("No dev constraints file found; source constraints already current.")
        return

    merged = {
        "version": dev.get("version", src.get("version", 1)),
        "tracks": {
            **src.get("tracks", {}),
            **dev.get("tracks", {}),
        },
    }
    write_json(SRC_PATH, merged)
    print(f"Exported {len(dev.get('tracks', {}))} track(s) into {SRC_PATH}")


if __name__ == "__main__":
    main()
