import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCreateCombatPackageTool } from './createCombatPackage.js';

type ToolHandler = (input: Record<string, unknown>) => Promise<unknown>;

function captureHandler(): { server: McpServer; getHandler: () => ToolHandler } {
  let handler: ToolHandler | undefined;
  const server = {
    registerTool: (_name: string, _config: unknown, candidate: ToolHandler) => {
      handler = candidate;
    },
  } as unknown as McpServer;

  return {
    server,
    getHandler: () => {
      if (!handler) throw new Error('Tool handler was not registered.');
      return handler;
    },
  };
}

async function createRepository(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'warfrontier-package-'));
  const stats = path.join(root, 'data/mods/warfrontier-federation/stats');
  await mkdir(stats, { recursive: true });
  await Promise.all([
    writeFile(path.join(stats, 'body.json'), '{}\n', 'utf8'),
    writeFile(path.join(stats, 'weapons.json'), '{}\n', 'utf8'),
    writeFile(path.join(stats, 'research.json'), '{}\n', 'utf8'),
    writeFile(path.join(stats, 'templates.json'), '{}\n', 'utf8'),
  ]);
  return root;
}

function validInput(root: string, confirm: boolean): Record<string, unknown> {
  return {
    repositoryRoot: root,
    bodyId: 'FED-H02',
    weaponId: 'FED-WPN-002',
    researchId: 'FED-RES-005',
    templateId: 'FED-TPL-H02',
    unitName: 'Sentinel',
    weaponName: 'Sentinel Phaser',
    researchName: 'Sentinel Systems',
    role: 'Medium combat vehicle',
    description: 'A test Federation combat package.',
    propulsion: 'hover01',
    requiredResearch: [],
    hitpoints: 900,
    armourKinetic: 55,
    armourHeat: 70,
    bodyBuildPower: 240,
    bodyBuildPoints: 520,
    bodyWeight: 7200,
    energyCapacity: 340,
    heatCapacity: 120,
    shieldCapacity: 220,
    damage: 58,
    firePause: 8,
    shortRange: 896,
    longRange: 1792,
    energyPerSecond: 7,
    heatPerSecond: 12,
    maximumDurationSeconds: 2.5,
    researchPoints: 2400,
    researchPower: 190,
    placeholderBodyModel: 'Viper.PIE',
    placeholderWeaponModel: 'GNMLASER.PIE',
    placeholderMountModel: 'TRMLASER.PIE',
    confirm,
  };
}

function textResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }] };
}

test('create_combat_package preview does not modify repository files', async () => {
  const root = await createRepository();
  try {
    const captured = captureHandler();
    registerCreateCombatPackageTool(captured.server, async () => root, textResult);
    const result = await captured.getHandler()(validInput(root, false));

    assert.match(JSON.stringify(result), /preview/);
    const stats = path.join(root, 'data/mods/warfrontier-federation/stats');
    assert.equal(await readFile(path.join(stats, 'body.json'), 'utf8'), '{}\n');
    await assert.rejects(
      readFile(path.join(root, 'docs/combat-packages/federation/FED-TPL-H02.md'), 'utf8'),
      { code: 'ENOENT' },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('create_combat_package commits all generated files', async () => {
  const root = await createRepository();
  try {
    const captured = captureHandler();
    registerCreateCombatPackageTool(captured.server, async () => root, textResult);
    const result = await captured.getHandler()(validInput(root, true));

    assert.match(JSON.stringify(result), /committed/);
    const stats = path.join(root, 'data/mods/warfrontier-federation/stats');
    const bodies = JSON.parse(await readFile(path.join(stats, 'body.json'), 'utf8')) as Record<string, unknown>;
    const weapons = JSON.parse(await readFile(path.join(stats, 'weapons.json'), 'utf8')) as Record<string, unknown>;
    const research = JSON.parse(await readFile(path.join(stats, 'research.json'), 'utf8')) as Record<string, unknown>;
    const templates = JSON.parse(await readFile(path.join(stats, 'templates.json'), 'utf8')) as Record<string, unknown>;

    assert.ok('FED-H02' in bodies);
    assert.ok('FED-WPN-002' in weapons);
    assert.ok('FED-RES-005' in research);
    assert.ok('FED-TPL-H02' in templates);
    assert.match(
      await readFile(path.join(root, 'docs/combat-packages/federation/FED-TPL-H02.md'), 'utf8'),
      /Sentinel/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('create_combat_package rejects duplicate IDs without changing files', async () => {
  const root = await createRepository();
  try {
    const stats = path.join(root, 'data/mods/warfrontier-federation/stats');
    await writeFile(path.join(stats, 'body.json'), '{"FED-H02":{"name":"Existing"}}\n', 'utf8');

    const captured = captureHandler();
    registerCreateCombatPackageTool(captured.server, async () => root, textResult);
    await assert.rejects(captured.getHandler()(validInput(root, true)), /Refusing to overwrite existing ID/);

    assert.equal(
      await readFile(path.join(stats, 'body.json'), 'utf8'),
      '{"FED-H02":{"name":"Existing"}}\n',
    );
    assert.equal(await readFile(path.join(stats, 'weapons.json'), 'utf8'), '{}\n');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
