# WarFrontier Builder Skill

## Purpose

Use this skill to assemble, create, extend, test, and release **WarFrontier**. It is the execution playbook for the project, while `skills/warfrontier/SKILL.md` is the compact project-memory file.

## Activation

Load both files before doing work:

1. `skills/warfrontier/SKILL.md`
2. `skills/warfrontier-builder/SKILL.md`

Compact instruction:

`Load the WarFrontier project and builder skills, inspect the active branch, then continue the next unfinished validated task.`

## Repository and branches

- Repository: `Jeanosasco/WarFrontier`
- Stable: `main`
- Integration: `develop`
- Active Federation work: `feature/federation-faction-package`
- Upstream base: Warzone 2100 commit `9360e01bcbfd1f260bc75262431630e6f4e5f65e`

Never implement experimental systems directly on `main`.

## Product rule

WarFrontier must become an original RTS, not a cosmetic reskin.

Every major feature must be classified as one of:

- inherited infrastructure;
- temporary placeholder;
- WarFrontier data prototype;
- WarFrontier engine implementation;
- runtime-tested gameplay;
- production-ready original asset.

Never describe a prototype as finished gameplay.

## Core gameplay architecture

WarFrontier-specific systems belong in isolated modules and namespaces whenever possible.

Preferred source layout:

```text
src/warfrontier/
  energy_system.*
  heat_system.*
  shield_system.*
  beam_weapon_system.*
  terrain_effects.*
  weather_system.*
  adaptive_ai.*
  component_damage.*
  economy_system.*
  campaign_system.*
```

During early integration, `src/warfrontier_systems.h/.cpp` may contain the compact prototype implementation.

## Build sequence

For every engineering task:

1. Inspect the active branch and relevant files.
2. Read the existing schema or interface before writing.
3. Make the smallest coherent change.
4. Keep upstream behavior unchanged unless the feature explicitly requires integration.
5. Build or run data validation.
6. Record errors exactly.
7. Fix errors before expanding scope.
8. Update status documentation.
9. Commit with a focused message.
10. Report validation truthfully.

## Unit creation pipeline

When creating a new combat unit, produce these deliverables in order:

1. Design specification
2. Stable unit ID
3. Body/component data
4. Propulsion selection or new propulsion data
5. Weapon data
6. Research unlocks
7. Unit template
8. Factory availability
9. Temporary model and effects
10. Runtime test
11. Final model, textures, effects, sound and HUD icon
12. Balance pass

Required checklist:

```text
Unit ID:
Faction:
Role:
Body:
Propulsion:
Weapons:
Energy capacity:
Energy regeneration:
Heat capacity:
Heat dissipation:
Shield capacity:
Shield regeneration:
Build cost:
Build time:
Research requirements:
Placeholder assets:
Final assets:
Validation status:
```

## Weapon creation pipeline

For each weapon define:

- unique ID;
- weapon role;
- damage model;
- range;
- accuracy or tracking;
- cadence or continuous duration;
- energy consumption;
- heat generation;
- target restrictions;
- impact behavior;
- temporary effects;
- final effects and sound;
- AI usage rules.

Continuous beams must not be treated as ordinary projectiles in the final implementation. Prototype projectile behavior must be explicitly labeled temporary.

## Shield creation pipeline

A true WarFrontier shield requires:

- capacity separate from hit points;
- damage interception;
- recharge delay;
- recharge rate;
- collapse state;
- energy consumption;
- visual state;
- sound state;
- multiplayer synchronization;
- save/load serialization.

Do not simulate a final shield merely by increasing structure HP.

## Faction creation pipeline

Each faction requires:

- strategic identity;
- strengths and weaknesses;
- visual language;
- resource model;
- technology branches;
- unit roster;
- building roster;
- defensive systems;
- AI doctrine;
- campaign role;
- audio identity;
- UI color and icon rules.

Faction gameplay must be asymmetric, not only visually different.

## Federation rules

The Federation uses:

- pearl-white curved hulls;
- cyan and blue energy;
- hover mobility;
- precision weapons;
- shields;
- expensive specialized units;
- lower physical durability than heavy industrial factions.

First prototype:

- `FED-H01` Guardian Phaser
- `FED-WPN-001` Tactical Phaser Emitter
- `FED-D06` Multiphase Deflector Array

## 3D asset pipeline

For every final vehicle or structure:

1. Orthographic reference sheet
2. High-poly model
3. Low-poly retopology
4. UV unwrap
5. PBR textures
6. Emissive mask
7. LOD0, LOD1, LOD2
8. Collision mesh
9. Pivots and attachment points
10. Animation test
11. Conversion to engine format
12. In-game scale and performance test

Never claim concept art is a game-ready model.

## Map creation pipeline

Each map requires:

- purpose and game mode;
- dimensions;
- terrain biome;
- height map;
- resource placement;
- spawn fairness;
- strategic routes;
- chokepoints;
- weather rules;
- ambient audio;
- AI navigation test;
- multiplayer test when applicable.

## Mission creation pipeline

Each campaign mission requires:

- mission ID and title;
- narrative objective;
- player start state;
- primary objectives;
- secondary objectives;
- triggers;
- failure states;
- enemy waves;
- reinforcement logic;
- dialogue;
- rewards;
- save/load test;
- difficulty test.

## UI creation pipeline

UI work must include:

- menu state;
- HUD layout;
- unit selection feedback;
- energy meter;
- heat meter;
- shield meter;
- production queue;
- research interface;
- minimap readability;
- accessibility and scaling;
- keyboard/controller behavior;
- localization-safe text.

## AI development

Implement AI in stages:

1. production rules;
2. research priorities;
3. unit composition;
4. target selection;
5. retreat and repair;
6. energy and heat awareness;
7. terrain awareness;
8. counter-strategy selection;
9. difficulty tuning;
10. deterministic multiplayer behavior where required.

## Validation gates

A feature advances only after passing its gate.

### Gate A — Data

- valid JSON or schema;
- unique IDs;
- all references resolve;
- assets exist;
- mod loads without parser errors.

### Gate B — Compile

- CMake configuration succeeds;
- relevant target builds;
- no new fatal warnings;
- platform-specific code is guarded.

### Gate C — Runtime

- game launches;
- feature can be accessed;
- feature behaves without crashes;
- save/load works where relevant;
- logs contain no new critical errors.

### Gate D — Gameplay

- feature is understandable;
- balance is reasonable;
- AI can use or counter it;
- multiplayer remains synchronized where applicable.

### Gate E — Production

- final original assets;
- performance target met;
- localization complete;
- documentation and attribution complete.

## Testing commands and strategy

Prefer existing project scripts and workflows over invented commands.

Before changing build configuration, inspect:

- root `CMakeLists.txt`;
- `src/CMakeLists.txt`;
- platform build documentation;
- existing GitHub Actions workflows.

Use small validation workflows for new modules before running full platform builds.

## Git rules

Commit prefixes:

- `feat:` gameplay or content feature
- `fix:` bug correction
- `build:` build system
- `data:` statistics or research data
- `art:` asset integration
- `ui:` interface
- `ai:` artificial intelligence
- `docs:` documentation
- `test:` tests and validation
- `refactor:` restructuring without intended gameplay change

Do not combine unrelated systems in one commit.

## Token-saving response mode

After loading this skill:

- do not repeat the entire roadmap;
- do not restate already established faction details;
- do not describe future phases unless they affect the current task;
- report only changed files, commit SHA, validation result, blockers, and next concrete step;
- when the user says `ok`, execute the next unfinished step;
- fetch only files needed for the current task.

Recommended completion report:

```text
Concluído:
- arquivos alterados
- commit

Validação:
- resultado real

Bloqueio:
- somente se existir

Próximo:
- uma ação concreta
```

## Current continuation point

At the time this skill was created, the immediate engineering sequence was:

1. implement `src/warfrontier_systems.cpp`;
2. add Guardian Phaser `templates.json`;
3. validate the Federation JSON package;
4. compile the feature branch;
5. connect energy, heat, shields and beams to actual game objects incrementally.
