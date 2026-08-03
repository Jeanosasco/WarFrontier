# WarFrontier Federation Prototype Mod

This directory contains the first data-driven gameplay prototypes for the Federation faction.

## Initial playable targets

- `FED-H01 Guardian Phaser` — medium hover combat body paired with the Tactical Phaser Emitter.
- `FED-D06 Multiphase Deflector Array` — fixed defensive structure prototype.

## Current limitations

The statistics and IDs are ready for integration testing, but the final PIE models, textures, sounds, icons, research entries, and localized strings are still pending. Placeholder model names are intentionally isolated in this mod package so they do not affect the base game until the package is explicitly loaded and completed.

## Files

- `stats/body.json` — Federation vehicle bodies.
- `stats/weapons.json` — Federation weapon prototypes.
- `stats/structure.json` — Federation defensive structures.
- `integration.json` — implementation status and asset requirements.

## Acceptance criteria for the first playable build

1. The mod loads without JSON parsing errors.
2. Guardian Phaser components appear in the design interface.
3. The Tactical Phaser can fire using temporary effects.
4. The Deflector Array can be placed as a defense structure.
5. Missing final artwork is replaced with documented temporary assets only.
