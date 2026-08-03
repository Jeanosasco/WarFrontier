# WarFrontier Project Skill

## Purpose

Use this skill whenever the user asks to continue, modify, build, document, test, or design **WarFrontier**. Load this file first instead of reconstructing the full conversation history.

## Repository

- Repo: `Jeanosasco/WarFrontier`
- Stable branch: `main`
- Integration branch: `develop`
- Active faction branch: `feature/federation-faction-package`
- Upstream base: Warzone 2100 commit `9360e01bcbfd1f260bc75262431630e6f4e5f65e`
- License: preserve GNU GPL obligations and upstream attribution.

## Product direction

WarFrontier must become an original RTS, not a cosmetic Warzone 2100 clone.

Core differences:

- unit energy reserves;
- heat and overheating;
- real regenerating shields;
- continuous beam weapons;
- asymmetric factions;
- terrain and weather effects;
- localized component damage;
- branched technology trees;
- original universe, campaign, UI, models, audio and visual effects.

Use inherited assets only as temporary placeholders for integration tests.

## Federation faction

Visual language:

- pearl-white curved hulls;
- cyan/blue energy;
- advanced hover technology;
- precision, mobility, shields and directed energy;
- expensive specialized units with lower physical durability than heavy industrial factions.

First playable batch:

1. `FED-H01` Guardian Phaser
2. Guardian Type-12
3. Quantum Artillery
4. Lumen Micro-Torpedo vehicle
5. Directional Plasma unit
6. `FED-D06` Multiphase Deflector Array

Primary weapon:

- `FED-WPN-001` Tactical Phaser Emitter

Research chain:

- `FED-RES-001` Phase Oscillators
- `FED-RES-002` Tactical Phaser Emitter
- `FED-RES-003` Guardian Phaser Body
- `FED-RES-004` Multiphase Deflector Array

## Current files

Faction design:

- `docs/factions/FEDERATION_PACKAGE.md`

Prototype mod:

- `data/mods/warfrontier-federation/README.md`
- `data/mods/warfrontier-federation/stats/body.json`
- `data/mods/warfrontier-federation/stats/weapons.json`
- `data/mods/warfrontier-federation/stats/structure.json`
- `data/mods/warfrontier-federation/stats/research.json`

Engine systems:

- `src/warfrontier_systems.h`

## Immediate next work

Perform these tasks in order unless the user changes priority:

1. Add `src/warfrontier_systems.cpp` with compilable implementations.
2. Add `data/mods/warfrontier-federation/stats/templates.json` for Guardian Phaser using `FED-H01`, `hover01`, and `FED-WPN-001`.
3. Add validation/documentation file describing placeholder limitations.
4. Build the feature branch and correct compilation/data-loading errors.
5. Connect WarFrontier combat state to actual game objects incrementally.
6. Replace placeholder models, sounds and effects with original assets.

## Coding rules

- Prefer new code under a clearly named WarFrontier namespace or module.
- Avoid scattering changes through upstream code when an isolated adapter is possible.
- Preserve upstream copyright headers.
- Keep commits focused and descriptive.
- Never claim a feature is playable until build and runtime validation succeed.
- Clearly distinguish: concept, data prototype, compilable engine code, and tested gameplay.
- Use existing Warzone assets only as documented placeholders.

## Git workflow

- Work on `feature/federation-faction-package` for Federation prototypes.
- Commit each coherent change.
- Validate before opening a PR into `develop`.
- Do not push experimental code directly to `main`.

## Response behavior

- Do not repeat the full roadmap after every small action.
- Report only: what changed, exact files/commit, validation status, blockers, and next action.
- When the user says `ok`, continue the next concrete implementation step instead of restating plans.
- Be honest about untested or incomplete features.

## Compact activation prompt

`Load skills/warfrontier/SKILL.md from Jeanosasco/WarFrontier and continue the next unfinished implementation task on feature/federation-faction-package.`
