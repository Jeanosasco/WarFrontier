#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { registerCreateCombatPackageTool } from './tools/createCombatPackage.js';
import { registerCreateResearchTool } from './tools/createResearch.js';
import { registerCreateStructureTool } from './tools/createStructure.js';
import { registerCreateUnitTool } from './tools/createUnit.js';
import { registerCreateWeaponTool } from './tools/createWeapon.js';
import { registerSuggestIdsTool } from './tools/suggestIds.js';

type JsonRecord = Record<string, unknown>;
type ValidationIssue = { file: string; message: string };

const server = new McpServer(
  { name: 'warfrontier-project-mcp', version: '0.6.0' },
  {
    instructions:
      'Use project_state before planning, suggest_ids before creating new Federation content, next_task before implementing, validate_federation after data changes, and always preview builder tools before confirming writes.',
  },
);

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveRepositoryRoot(explicitRoot?: string): Promise<string> {
  const candidates = [
    explicitRoot,
    process.env.WARFRONTIER_ROOT,
    process.cwd(),
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd(), '../..'),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    const root = path.resolve(candidate);
    if (
      (await exists(path.join(root, 'CMakeLists.txt'))) &&
      (await exists(path.join(root, 'skills/warfrontier/SKILL.md')))
    ) {
      return root;
    }
  }

  throw new Error(
    'WarFrontier repository root not found. Set WARFRONTIER_ROOT or pass repositoryRoot.',
  );
}

async function readJson(filePath: string): Promise<JsonRecord> {
  const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'));
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('Expected a JSON object at the file root.');
  }
  return parsed as JsonRecord;
}

function textResult(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: typeof value === 'string' ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

server.registerTool(
  'project_state',
  {
    title: 'WarFrontier Project State',
    description: 'Return a compact snapshot of the local WarFrontier repository.',
    inputSchema: z.object({ repositoryRoot: z.string().optional() }),
  },
  async ({ repositoryRoot }) => {
    const root = await resolveRepositoryRoot(repositoryRoot);
    const importantFiles = [
      'src/warfrontier_systems.h',
      'src/warfrontier_systems.cpp',
      'data/mods/warfrontier-federation/stats/body.json',
      'data/mods/warfrontier-federation/stats/weapons.json',
      'data/mods/warfrontier-federation/stats/structure.json',
      'data/mods/warfrontier-federation/stats/research.json',
      'data/mods/warfrontier-federation/stats/templates.json',
      'skills/warfrontier/SKILL.md',
      'skills/warfrontier-builder/SKILL.md',
    ];
    const files = Object.fromEntries(
      await Promise.all(
        importantFiles.map(async (relativePath) => [
          relativePath,
          await exists(path.join(root, relativePath)),
        ]),
      ),
    );

    return textResult({
      repositoryRoot: root,
      upstreamBase: '9360e01bcbfd1f260bc75262431630e6f4e5f65e',
      activeDevelopmentBranch: 'feature/federation-faction-package',
      mcpBranch: 'feature/warfrontier-mcp',
      tools: [
        'project_state',
        'suggest_ids',
        'next_task',
        'validate_federation',
        'create_unit',
        'create_weapon',
        'create_research',
        'create_structure',
        'create_combat_package',
      ],
      files,
    });
  },
);

server.registerTool(
  'next_task',
  {
    title: 'Next WarFrontier Task',
    description: 'Identify the next unfinished implementation task from the project skills.',
    inputSchema: z.object({ repositoryRoot: z.string().optional() }),
  },
  async ({ repositoryRoot }) => {
    const root = await resolveRepositoryRoot(repositoryRoot);
    const tasks = [
      {
        id: 'engine-implementation',
        file: 'src/warfrontier_systems.cpp',
        action: 'Implement the EnergyState, HeatState, ShieldState and BeamWeaponState methods.',
      },
      {
        id: 'guardian-template',
        file: 'data/mods/warfrontier-federation/stats/templates.json',
        action: 'Add the Guardian Phaser template using FED-H01, hover01 and FED-WPN-001.',
      },
      {
        id: 'federation-validation',
        file: 'data/mods/warfrontier-federation/VALIDATION.md',
        action: 'Document placeholder assets and validation results for the Federation prototype.',
      },
    ];

    for (const task of tasks) {
      if (!(await exists(path.join(root, task.file)))) {
        return textResult({ status: 'pending', ...task });
      }
    }

    return textResult({
      status: 'ready-for-validation',
      action: 'Run validate_federation, then compile the feature branch.',
    });
  },
);

server.registerTool(
  'validate_federation',
  {
    title: 'Validate Federation Prototype',
    description:
      'Validate Federation JSON syntax, required IDs and cross-file references without changing files.',
    inputSchema: z.object({ repositoryRoot: z.string().optional() }),
  },
  async ({ repositoryRoot }) => {
    const root = await resolveRepositoryRoot(repositoryRoot);
    const statsRoot = path.join(root, 'data/mods/warfrontier-federation/stats');
    const fileNames = ['body.json', 'weapons.json', 'structure.json', 'research.json', 'templates.json'];
    const issues: ValidationIssue[] = [];
    const loaded: Record<string, JsonRecord> = {};

    for (const fileName of fileNames) {
      const filePath = path.join(statsRoot, fileName);
      if (!(await exists(filePath))) {
        issues.push({ file: fileName, message: 'File is missing.' });
        continue;
      }
      try {
        loaded[fileName] = await readJson(filePath);
      } catch (error) {
        issues.push({
          file: fileName,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const bodies = loaded['body.json'] ?? {};
    const weapons = loaded['weapons.json'] ?? {};
    const structures = loaded['structure.json'] ?? {};
    const research = loaded['research.json'] ?? {};
    const templates = loaded['templates.json'] ?? {};

    if (!('FED-H01' in bodies)) issues.push({ file: 'body.json', message: 'Missing required body ID FED-H01.' });
    if (!('FED-WPN-001' in weapons)) issues.push({ file: 'weapons.json', message: 'Missing required weapon ID FED-WPN-001.' });
    if (!('FED-D06' in structures)) issues.push({ file: 'structure.json', message: 'Missing required structure ID FED-D06.' });

    for (const id of ['FED-RES-001', 'FED-RES-002', 'FED-RES-003', 'FED-RES-004']) {
      if (!(id in research)) {
        issues.push({ file: 'research.json', message: `Missing required research ID ${id}.` });
      }
    }

    const guardianTemplate = templates['FED-TPL-H01'];
    if (guardianTemplate && typeof guardianTemplate === 'object' && guardianTemplate !== null) {
      const record = guardianTemplate as JsonRecord;
      if (record.body !== 'FED-H01') {
        issues.push({ file: 'templates.json', message: 'FED-TPL-H01 must reference body FED-H01.' });
      }
      if (record.propulsion !== 'hover01') {
        issues.push({ file: 'templates.json', message: 'FED-TPL-H01 must use hover01 for the prototype.' });
      }
      if (!Array.isArray(record.weapons) || !record.weapons.includes('FED-WPN-001')) {
        issues.push({ file: 'templates.json', message: 'FED-TPL-H01 must reference FED-WPN-001.' });
      }
    } else if ('templates.json' in loaded) {
      issues.push({ file: 'templates.json', message: 'Missing required template ID FED-TPL-H01.' });
    }

    return textResult({
      valid: issues.length === 0,
      checkedFiles: fileNames,
      counts: {
        bodies: Object.keys(bodies).length,
        weapons: Object.keys(weapons).length,
        structures: Object.keys(structures).length,
        research: Object.keys(research).length,
        templates: Object.keys(templates).length,
      },
      issues,
    });
  },
);

registerSuggestIdsTool(server, resolveRepositoryRoot, textResult);
registerCreateUnitTool(server, resolveRepositoryRoot, textResult);
registerCreateWeaponTool(server, resolveRepositoryRoot, textResult);
registerCreateResearchTool(server, resolveRepositoryRoot, textResult);
registerCreateStructureTool(server, resolveRepositoryRoot, textResult);
registerCreateCombatPackageTool(server, resolveRepositoryRoot, textResult);

async function main(): Promise<void> {
  await server.connect(new StdioServerTransport());
  console.error('WarFrontier MCP server running on stdio');
}

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

main().catch((error: unknown) => {
  console.error('Fatal WarFrontier MCP error:', error);
  process.exit(1);
});
