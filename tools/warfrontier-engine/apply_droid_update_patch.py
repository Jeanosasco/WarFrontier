#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path
import sys

DROID_CPP = Path("src/droid.cpp")
FUNCTION_SIGNATURE = "void droidUpdate(DROID *psDroid)\n{"
MARKER = "// WarFrontier combat systems update"
INSERTION = """void droidUpdate(DROID *psDroid)
{
	// WarFrontier combat systems update
	if (psDroid->warfrontierCombatEnabled)
	{
		const float deltaSeconds = static_cast<float>(deltaGameTime) / GAME_TICKS_PER_SEC;
		psDroid->warfrontierCombat.update(deltaSeconds);
	}
"""


def main() -> int:
    if not DROID_CPP.is_file():
        print(f"error: missing {DROID_CPP}", file=sys.stderr)
        return 1

    source = DROID_CPP.read_text(encoding="utf-8")

    if MARKER in source:
        print("WarFrontier droid update integration already present.")
        return 0

    occurrence_count = source.count(FUNCTION_SIGNATURE)
    if occurrence_count != 1:
        print(
            f"error: expected exactly one droidUpdate signature, found {occurrence_count}",
            file=sys.stderr,
        )
        return 1

    patched = source.replace(FUNCTION_SIGNATURE, INSERTION.rstrip("\n"), 1)
    DROID_CPP.write_text(patched, encoding="utf-8")
    print("Inserted WarFrontier combat update into droidUpdate().")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
