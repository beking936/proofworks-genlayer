"""Prepare a local GENVMROOT for genvm-lint validation.

Why this exists:
- genvm-lint validates contracts by loading the GenLayer SDK.
- At the time this project was created, the latest GitHub release redirect pointed
  to a release asset that was not available, so validation needs a pinned SDK.
- gltest can reliably fetch/extract GenVM v0.2.12. This script reuses that loader
  and copies the SDK into .genvmroot, which is ignored by git.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

from gltest.direct.sdk_loader import setup_sdk_paths

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "proofworks_escrow.py"
TARGET = ROOT / ".genvmroot" / "runners" / "py-lib-genlayer-std" / "src"


def main() -> None:
    setup_sdk_paths(CONTRACT, "v0.2.12")
    genlayer_paths = []
    for item in sys.path:
        p = Path(item)
        if (p / "genlayer").exists():
            genlayer_paths.append(p)

    if not genlayer_paths:
        raise SystemExit("Could not locate extracted GenLayer SDK in sys.path")

    # Prefer the SDK extracted by gltest for the pinned version. Do not copy an
    # unrelated site-packages `genlayer` package if one is installed globally.
    extracted = [p for p in genlayer_paths if "gltest-direct" in str(p) and "py-lib-genlayer-std" in str(p)]
    candidates = extracted or genlayer_paths
    source = max(candidates, key=lambda p: len(list((p / "genlayer").rglob("*.py"))))

    if TARGET.exists():
        shutil.rmtree(TARGET)
    TARGET.mkdir(parents=True, exist_ok=True)

    for child in source.iterdir():
        dest = TARGET / child.name
        if child.is_dir():
            shutil.copytree(child, dest, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
        else:
            shutil.copy2(child, dest)

    print(f"GENVMROOT prepared at {ROOT / '.genvmroot'}")


if __name__ == "__main__":
    main()
