# WarFrontier Project MCP — Installation

This guide installs and configures the local WarFrontier MCP server.

## Requirements

- Node.js 20 or newer
- npm
- A local checkout of the WarFrontier repository
- A client with Model Context Protocol support

## Install dependencies

From the repository root:

```bash
cd tools/warfrontier-mcp
npm install
```

## Build

```bash
npm run build
```

The compiled server is written to:

```text
tools/warfrontier-mcp/dist/index.js
```

## Run directly

Set the WarFrontier repository root and start the server:

### Linux or macOS

```bash
export WARFRONTIER_ROOT=/absolute/path/to/WarFrontier
node /absolute/path/to/WarFrontier/tools/warfrontier-mcp/dist/index.js
```

### Windows PowerShell

```powershell
$env:WARFRONTIER_ROOT = "C:\absolute\path\to\WarFrontier"
node "C:\absolute\path\to\WarFrontier\tools\warfrontier-mcp\dist\index.js"
```

The server communicates through standard input and output. It is normally launched by an MCP client rather than used interactively in a terminal.

## Example MCP configuration

Use absolute paths. Replace the example paths with the local repository location.

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

Windows example:

```json
{
  "mcpServers": {
    "warfrontier": {
      "command": "node",
      "args": [
        "C:\\WarFrontier\\tools\\warfrontier-mcp\\dist\\index.js"
      ],
      "env": {
        "WARFRONTIER_ROOT": "C:\\WarFrontier"
      }
    }
  }
}
```

## Development mode

Run the TypeScript source without building first:

```bash
npm run dev
```

The `WARFRONTIER_ROOT` environment variable is still recommended.

## MCP Inspector

To inspect tools and execute test calls locally:

```bash
npm run inspect
```

The inspector builds the server and starts the official MCP inspection interface.

## Validation commands

Before using a modified MCP build:

```bash
npm run typecheck
npm test
npm run build
```

## Recommended first session

After connecting the client, call the tools in this order:

1. `project_state`
2. `analyze_federation`
3. `suggest_ids`
4. A builder tool with `confirm=false`
5. Review the preview
6. Repeat with `confirm=true`
7. `validate_federation`
8. Inspect the Git diff and test the game before committing

## Safety model

Builder tools default to preview mode. Files are written only when `confirm=true` is supplied.

All builders use recoverable multi-file transactions. Existing IDs are not overwritten, generated documentation is protected from accidental replacement, and failed writes attempt to restore the previous files.

The transaction protects local files from partial MCP writes, but it does not replace source control. Always inspect and commit changes with Git.

## Troubleshooting

### Repository root not found

Set `WARFRONTIER_ROOT` to the absolute WarFrontier directory. The directory must contain both:

```text
CMakeLists.txt
skills/warfrontier/SKILL.md
```

### Compiled entry point missing

Run:

```bash
npm run build
```

Then confirm that `dist/index.js` exists.

### Tool refuses an ID

The ID already exists in its destination JSON file. Run `suggest_ids` and use a free identifier.

### JSON parsing error

One of the Federation statistics files is malformed. Repair the JSON manually or restore it with Git before running a builder.

### A generated package is structurally valid but does not load in game

The MCP validates WarFrontier references and prototypes, but final compatibility still requires compiling and running the game. Placeholder models, effects, sounds, engine integration and balance must be reviewed separately.
