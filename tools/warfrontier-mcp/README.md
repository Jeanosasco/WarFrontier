# WarFrontier Project MCP

Local Model Context Protocol server for assembling, validating and maintaining the WarFrontier project.

The MCP provides read-only project analysis, automatic ID discovery, Federation data validation and transactional builders for units, weapons, structures, research topics and complete combat packages.

## Status

The current branch contains the release candidate for **WarFrontier Project MCP 1.0**.

Core capabilities:

- project state inspection;
- Federation dependency analysis;
- automatic free-ID suggestions;
- structural validation;
- preview-first builders;
- recoverable multi-file writes with rollback;
- automated TypeScript, build and test checks in CI.

## Requirements

- Node.js 20 or newer
- npm
- A local checkout of the WarFrontier repository
- An MCP-compatible client

## Quick start

```bash
cd tools/warfrontier-mcp
npm install
npm run typecheck
npm test
npm run build
```

Set the repository root:

```bash
export WARFRONTIER_ROOT=/absolute/path/to/WarFrontier
```

Windows PowerShell:

```powershell
$env:WARFRONTIER_ROOT = "C:\absolute\path\to\WarFrontier"
```

Run the server:

```bash
npm start
```

The server uses the MCP `stdio` transport. Diagnostic messages are written to `stderr`; protocol messages use `stdout`.

For complete setup instructions, see [INSTALL.md](INSTALL.md).

## Client configuration

Use absolute paths:

```json
{
  "mcpServers": {
    "warfrontier": {
      "command": "node",
      "args": [
        "/absolute/path/to/WarFrontier/tools/warfrontier-mcp/dist/index.js"
      ],
      "env": {
        "WARFRONTIER_ROOT": "/absolute/path/to/WarFrontier"
      }
    }
  }
}
```

## Recommended workflow

1. Call `project_state`.
2. Call `analyze_federation`.
3. Call `suggest_ids`.
4. Run a builder with `confirm=false`.
5. Review the preview.
6. Repeat the call with `confirm=true`.
7. Call `validate_federation`.
8. Inspect the Git diff.
9. Compile and test the game before committing.

## Available tools

### Project inspection

- `project_state` — returns repository paths, important files, active branches and the registered tool list.
- `next_task` — identifies the next unfinished implementation task from the project workflow.
- `suggest_ids` — returns the first available Federation body, weapon, research, structure and template IDs.

### Project Brain

- `analyze_federation` — detects broken references, orphaned content, missing unlocks and placeholder assets.
- `validate_federation` — checks required JSON files, key Federation IDs and core cross-file references.

### Builders

- `create_unit` — creates a Federation body, vehicle template and specification document.
- `create_weapon` — creates a Federation weapon prototype and documentation.
- `create_structure` — creates a Federation structure prototype and documentation.
- `create_research` — creates a Federation research topic and documentation.
- `create_combat_package` — creates a complete body, weapon, research, template and package specification in one transaction.

All builder tools default to preview mode and write only when `confirm=true` is provided.

## Safety model

The MCP is designed to reduce accidental repository damage:

- existing IDs are rejected;
- generated documentation is protected from accidental overwrite;
- builders first generate all changes in memory;
- files are written through unique temporary files;
- previous files are moved to temporary backups;
- failed promotions trigger rollback and backup restoration;
- preview mode performs no writes;
- every write response lists the changed paths.

The transaction layer protects against partial MCP writes, but it does not replace Git. Always inspect diffs and keep commits small.

## Development commands

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm run inspect
```

`npm run inspect` starts the MCP Inspector after compiling the server.

## Testing

The test suite uses the Node.js native test runner.

Current coverage includes:

- automatic ID selection and gap filling;
- template ID fallback;
- transactional multi-file commits;
- protection against duplicate destinations;
- `mustNotExist` behavior;
- temporary-file cleanup;
- combat-package preview;
- complete combat-package commit;
- duplicate-ID rejection without repository modification.

The GitHub Actions workflow runs typecheck, tests, build verification and artifact upload for pushes and pull requests that modify the MCP.

## Project layout

```text
tools/warfrontier-mcp/
├── src/
│   ├── index.ts
│   ├── lib/
│   │   └── atomicWrite.ts
│   └── tools/
│       ├── analyzeFederation.ts
│       ├── createCombatPackage.ts
│       ├── createResearch.ts
│       ├── createStructure.ts
│       ├── createUnit.ts
│       ├── createWeapon.ts
│       └── suggestIds.ts
├── INSTALL.md
├── package.json
├── tsconfig.json
└── README.md
```

## Current limitations

- The Federation data is still a prototype and may reference placeholder models, effects and sounds.
- Structural validation does not replace compiling and running WarFrontier.
- The Project Brain does not yet provide a fully navigable dependency graph.
- Final game balance, runtime engine behavior and asset licensing still require manual review.
- Builders currently target the Federation data package only.

## Release policy

- `1.0.x` — stability fixes and bug corrections.
- `1.1.x` — small compatible improvements.
- `2.0.0` — larger modules such as advanced dependency graphs, asset management or AI-assisted design.

The 1.0 scope intentionally excludes the future Balance AI, Campaign Designer, Asset Manager and WarFrontier Studio modules.

## Contributing

Before submitting changes:

```bash
npm run typecheck
npm test
npm run build
```

Builder changes should preserve preview-first behavior, reject accidental overwrites, use `writeFilesTransaction` for writes and include tests for success and failure paths.

## License and project relationship

This MCP is part of the WarFrontier repository and follows the repository's licensing and contribution requirements. Generated prototypes may reference assets from the upstream development base; production releases must verify asset origin, compatibility and licensing separately.
