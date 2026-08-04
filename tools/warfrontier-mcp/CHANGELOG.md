# Changelog

All notable changes to the WarFrontier Project MCP are documented here.

## 1.0.0 — Release candidate

### Added

- Local MCP server using the `stdio` transport.
- Repository root resolution through `repositoryRoot`, `WARFRONTIER_ROOT` and nearby directories.
- `project_state` for repository and tool inspection.
- `next_task` for compact project continuity guidance.
- `suggest_ids` for safe Federation ID allocation.
- `analyze_federation` for broken references, orphaned content, missing unlocks and placeholder analysis.
- `validate_federation` for required files, IDs and core cross-file references.
- `create_unit` with preview-first body, template and documentation generation.
- `create_weapon` with continuous-beam prototype metadata.
- `create_structure` with weapon, shield and energy prototype fields.
- `create_research` with prerequisite and unlock validation.
- `create_combat_package` for body, weapon, research, template and documentation generation in one operation.
- Recoverable multi-file transactions with temporary files, backups and rollback.
- Protection against duplicate IDs, duplicate destinations and accidental documentation overwrites.
- Node.js native unit and integration tests.
- GitHub Actions validation for typecheck, tests, build and compiled artifact upload.
- Installation, tool reference and architecture documentation.

### Changed

- All builders now default to `confirm=false` and require explicit confirmation before writing.
- All builder writes now use the shared transactional writer.
- Builder responses now report committed transactions and written file paths.
- Federation JSON output is sorted by top-level ID for predictable Git diffs.
- The server and package version were aligned at `0.7.0` during release-candidate development, before the final `1.0.0` version bump.

### Tested

- Free-ID selection and numeric gap filling.
- Template-ID fallback.
- Multi-file transaction commits.
- Duplicate transaction destination rejection.
- `mustNotExist` protection.
- Temporary and backup cleanup after successful writes.
- Combat-package preview without filesystem changes.
- Complete combat-package transactional commit.
- Duplicate-ID rejection without modifying unrelated files.

### Known limitations

- Federation data remains a prototype and may use placeholder models, effects and sounds.
- Structural validation does not replace compiling and running WarFrontier.
- The Project Brain does not yet provide a persistent, navigable dependency graph.
- Builders currently target the Federation package only.
- Final balance, asset licensing, multiplayer determinism and runtime engine integration require manual validation.

## Pre-1.0 development

The MCP began as a read-only project-state and Federation validation server. It was expanded incrementally with ID suggestions, Project Brain analysis, individual builders, complete combat packages, tests, CI, transactional writes and release documentation.
