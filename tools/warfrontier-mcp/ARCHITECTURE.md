# WarFrontier Project MCP — Architecture

## Overview

The WarFrontier Project MCP is a local TypeScript server that exposes project inspection, validation and content-building tools through the Model Context Protocol.

Its architecture is intentionally split into five layers:

```text
MCP client
   │
   ▼
Server and tool registry
   │
   ├── Project inspection
   ├── Project Brain
   ├── Builders
   └── Shared infrastructure
            │
            ├── Repository resolution
            ├── JSON handling
            ├── Transactional writes
            └── Tests and CI
```

## Entry point

`src/index.ts` creates the MCP server, registers all tools and connects the process through `StdioServerTransport`.

The entry point also provides shared helpers for:

- locating the WarFrontier repository;
- returning text-based MCP responses;
- reading project state;
- validating the Federation prototype.

The repository root is resolved from:

1. the explicit `repositoryRoot` argument;
2. `WARFRONTIER_ROOT`;
3. the current directory;
4. nearby parent directories.

A valid root must contain the expected WarFrontier marker files.

## Tool groups

### Project inspection

- `project_state`
- `next_task`
- `suggest_ids`

These tools do not modify files. They provide repository context and help select safe identifiers before content generation.

### Project Brain

- `analyze_federation`
- `validate_federation`

The Project Brain reads the Federation statistics files and reports structural issues, broken references, orphaned components, missing unlocks and placeholder assets.

Version 1.0 is a static analysis layer, not yet a complete persistent dependency graph.

### Builders

- `create_unit`
- `create_weapon`
- `create_structure`
- `create_research`
- `create_combat_package`

Every builder follows the same lifecycle:

```text
Validate input
   ↓
Resolve repository root
   ↓
Read current JSON files
   ↓
Reject duplicate IDs or invalid references
   ↓
Generate proposed records in memory
   ↓
Return preview when confirm=false
   ↓
Commit through writeFilesTransaction when confirm=true
   ↓
Return written paths and next validation step
```

Builders generate both game data and Markdown specifications so that prototypes remain documented alongside the source files.

## Preview-first safety

The default for every builder is `confirm=false`.

Preview mode:

- performs all input validation;
- reads the same repository files used by write mode;
- checks duplicate IDs and known prerequisite errors;
- generates the complete proposed output;
- does not create directories or alter files.

Write mode must be explicitly requested with `confirm=true`.

## Transactional file writes

`src/lib/atomicWrite.ts` implements recoverable multi-file writes.

For each destination the transaction:

1. resolves the absolute path;
2. rejects duplicate destinations;
3. creates the parent directory;
4. checks `mustNotExist` constraints;
5. writes content to a unique temporary file beside the destination;
6. moves existing files to unique backup paths;
7. promotes every temporary file to its final destination;
8. deletes backups only after all promotions succeed.

If any stage fails:

- promoted files are removed;
- backups are restored in reverse order;
- remaining temporary and backup files are cleaned up;
- the original error is rethrown.

This protects against partial MCP writes. It does not provide filesystem-wide atomicity across different devices and does not replace Git source control.

## JSON data model

Federation content is stored as JSON objects keyed by stable IDs.

Primary files:

```text
data/mods/warfrontier-federation/stats/
├── body.json
├── weapons.json
├── structure.json
├── research.json
└── templates.json
```

Builders sort top-level IDs before serialization to keep diffs predictable and reviewable.

The `warfrontier` property stores prototype-specific metadata such as energy, heat, shield and continuous-beam settings without replacing the upstream fields required by the game data format.

## Documentation generation

Builders create specifications under:

```text
docs/units/federation/
docs/weapons/federation/
docs/structures/federation/
docs/research/federation/
docs/combat-packages/federation/
```

Documentation files use `mustNotExist: true`. Existing specifications are never silently replaced.

## Validation boundaries

The MCP validates:

- JSON syntax and object roots;
- required Federation IDs;
- selected cross-file references;
- duplicate identifiers;
- builder-specific input rules;
- known missing prerequisites;
- placeholder and orphan warnings.

It does not prove:

- full compatibility with every Warzone 2100 data loader rule;
- correct engine runtime behavior;
- final asset licensing;
- visual quality;
- gameplay balance;
- multiplayer determinism.

Compilation and in-game testing remain required after generated changes.

## Tests

The test suite uses the Node.js native test runner.

Test categories:

### Unit tests

- free-ID selection;
- gap filling;
- template-ID fallback.

### Filesystem integration tests

- multi-file transaction commit;
- duplicate destination rejection;
- `mustNotExist` protection;
- replacement and cleanup behavior.

### Builder integration tests

- combat-package preview performs no writes;
- confirmed package writes all expected files;
- duplicate IDs are rejected without repository modification.

Tests create isolated temporary directories and remove them after execution.

## Continuous integration

`.github/workflows/warfrontier-mcp-ci.yml` runs when MCP files or the workflow change.

Pipeline:

```text
Checkout
   ↓
Node.js 20
   ↓
npm install
   ↓
Typecheck
   ↓
npm test
   ↓
Build
   ↓
Verify dist/index.js
   ↓
Upload compiled artifact
```

CI validates the MCP package independently of the full WarFrontier game build.

## Extension rules

New builder tools should:

- default to preview mode;
- validate all inputs before writing;
- reject accidental overwrites;
- prepare complete output in memory;
- use `writeFilesTransaction`;
- return every changed path;
- include success and failure tests;
- document runtime limitations.

New Project Brain analyzers should remain read-only unless explicitly designed as builder or repair tools.

## Version 1.0 boundaries

Version 1.0 focuses on reliable Federation project assembly and validation.

Deferred modules include:

- persistent dependency graph storage;
- impact analysis before edits;
- automatic balance scoring;
- asset conversion and packaging;
- campaign generation;
- visual editor integration;
- autonomous game design decisions.

These belong to later compatible releases or a future 2.0 architecture.
