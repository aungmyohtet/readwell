#!/usr/bin/env python3
"""
Content Status — shows curriculum coverage at a glance.

Usage:
    python content/status.py            # summary table
    python content/status.py --missing  # only show missing units
    python content/status.py --level B1 # filter by level
"""

import json
import sys
import io
from pathlib import Path

# Force UTF-8 output so box-drawing and block chars render on all terminals
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

CURRICULUM_PATH = Path(__file__).parent / "curriculum" / "curriculum.json"
STORIES_DIR     = Path(__file__).parent / "stories"

GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
RESET  = "\033[0m"


def load_covered():
    """Return dict: (level, grammar_rule) -> list of 'Story ch N' strings."""
    covered: dict[tuple, list] = {}
    for jf in sorted(STORIES_DIR.glob("*.json")):
        with open(jf, encoding="utf-8") as f:
            data = json.load(f)
        level = data["story"]["level"]
        title = data["story"]["title"]
        for ch in data.get("chapters", []):
            rule = ch.get("grammarFocus", {}).get("rule", "").strip()
            if rule:
                key = (level, rule)
                covered.setdefault(key, []).append(f"{title} ch{ch['chapterNumber']}")
    return covered


def main():
    args = sys.argv[1:]
    only_missing = "--missing" in args
    filter_level = None
    if "--level" in args:
        idx = args.index("--level")
        if idx + 1 < len(args):
            filter_level = args[idx + 1].upper()

    with open(CURRICULUM_PATH, encoding="utf-8") as f:
        curriculum = json.load(f)

    covered = load_covered()

    total_units = 0
    total_done  = 0

    for level, cfg in curriculum["levels"].items():
        if filter_level and level != filter_level:
            continue

        units      = cfg["grammarUnits"]
        done_count = sum(1 for u in units if (level, u["grammar"]) in covered)
        total_units += len(units)
        total_done  += done_count

        print(f"\n{BOLD}{CYAN}{level}{RESET}  {done_count}/{len(units)} units covered")
        print("  " + "─" * 60)

        for u in units:
            key = (level, u["grammar"])
            if key in covered:
                if not only_missing:
                    stories = ", ".join(covered[key])
                    print(f"  {GREEN}[{u['unit']:2d}] DONE   {RESET}{u['grammar']}")
                    print(f"         {DIM}{stories}{RESET}")
            else:
                print(f"  {RED}[{u['unit']:2d}] MISS   {RESET}{u['grammar']}")

    # Summary bar
    pct = int(total_done / total_units * 100) if total_units else 0
    bar_len = 40
    filled  = int(bar_len * total_done / total_units) if total_units else 0
    bar     = f"{'█' * filled}{'░' * (bar_len - filled)}"

    print(f"\n{BOLD}Overall coverage{RESET}: {total_done}/{total_units} units  [{pct}%]")
    print(f"  {GREEN}{bar}{RESET}")
    print()


if __name__ == "__main__":
    main()
