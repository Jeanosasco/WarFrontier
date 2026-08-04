import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { writeFilesTransaction } from '../lib/atomicWrite.js';

type JsonRecord = Record<string, unknown>;
type ResolveRoot = (explicitRoot?: string) => Promise<string>;
type TextResult = (value: unknown) => { content: Array<{ type: 'text'; text: string }> };

async function readJsonObject(filePath: string): Promise<JsonRecord> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as JsonRecord;
    throw new Error('JSON root must be an object.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
}

function sortRecord(record: JsonRecord): JsonRecord {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

export function registerCreateWeaponTool(server: McpServer, resolveRepositoryRoot: ResolveRoot, textResult: TextResult): void {
  server.registerTool('create_weapon', {
    title: 'Create WarFrontier Weapon',
    description: 'Preview or create a Federation weapon prototype and specification document. Writing requires confirm=true.',
    inputSchema: z.object({
      repositoryRoot: z.string().optional(), id: z.string().regex(/^FED-WPN-\d{3}$/),
      name: z.string().min(3).max(100), role: z.string().min(3).max(100),
      damage: z.number().int().positive().default(34), firePause: z.number().int().positive().default(5),
      shortRange: z.number().int().positive().default(768), longRange: z.number().int().positive().default(1536),
      shortHit: z.number().int().min(0).max(100).default(98), longHit: z.number().int().min(0).max(100).default(98),
      energyPerSecond: z.number().nonnegative().default(4), heatPerSecond: z.number().nonnegative().default(8),
      maximumDurationSeconds: z.number().positive().default(2.5),
      weaponClass: z.enum(['HEAT', 'KINETIC']).default('HEAT'), weaponEffect: z.string().default('ANTI PERSONNEL'),
      weaponSubClass: z.string().default('LAS_SAT'), placeholderModel: z.string().default('GNMLASER.PIE'),
      placeholderMountModel: z.string().default('TRMLASER.PIE'), placeholderMuzzleGfx: z.string().default('FXLASER.PIE'),
      placeholderHitGfx: z.string().default('FXLASER.PIE'), placeholderSound: z.string().default('lasstrik.ogg'),
      buildPower: z.number().int().positive().default(140), buildPoints: z.number().int().positive().default(360),
      weight: z.number().int().positive().default(2600), confirm: z.boolean().default(false),
    }),
  }, async (input) => {
    if (input.shortRange > input.longRange) throw new Error('shortRange cannot be greater than longRange.');
    const root = await resolveRepositoryRoot(input.repositoryRoot);
    const weaponPath = path.join(root, 'data/mods/warfrontier-federation/stats/weapons.json');
    const specPath = path.join(root, 'docs/weapons/federation', `${input.id}.md`);
    const weapons = await readJsonObject(weaponPath);
    if (input.id in weapons) throw new Error(`Refusing to overwrite existing weapon ID: ${input.id}`);

    const weapon = {
      buildPoints: input.buildPoints, buildPower: input.buildPower, damage: input.damage, designable: 1,
      effectSize: 100, explosionWav: 'lrgexpl.ogg', facePlayer: 1, firePause: input.firePause,
      flightGfx: 'FXLASSAT.PIE', flightSpeed: 2500, hitGfx: input.placeholderHitGfx, hitpoints: 180,
      id: input.id, lightWorld: 1, longHit: input.longHit, longRange: input.longRange, maxElevation: 75,
      minElevation: -20, minimumDamage: 35, missGfx: input.placeholderHitGfx, model: input.placeholderModel,
      mountModel: input.placeholderMountModel, movement: 'DIRECT', muzzleGfx: input.placeholderMuzzleGfx,
      name: input.name, numExplosions: 1, recoilValue: 10, reloadTime: 0, rotate: 180,
      shortHit: input.shortHit, shortRange: input.shortRange, waterGfx: 'FXSSplsh.PIE',
      weaponClass: input.weaponClass, weaponEffect: input.weaponEffect, weaponSubClass: input.weaponSubClass,
      weaponWav: input.placeholderSound, weight: input.weight,
      warfrontier: { energyPerSecond: input.energyPerSecond, heatPerSecond: input.heatPerSecond,
        maximumDurationSeconds: input.maximumDurationSeconds, mode: 'continuous-beam-prototype', status: 'data-prototype' },
    };
    const specification = `# ${input.name}\n\n- Weapon ID: \`${input.id}\`\n- Faction: Federation\n- Role: ${input.role}\n- Damage: ${input.damage}\n- Short range: ${input.shortRange}\n- Long range: ${input.longRange}\n- Energy per second: ${input.energyPerSecond}\n- Heat per second: ${input.heatPerSecond}\n- Maximum duration: ${input.maximumDurationSeconds}s\n- Placeholder model: \`${input.placeholderModel}\`\n- Validation status: data prototype; continuous beam engine integration pending\n\n## Required follow-up\n\n- Add or verify the research unlock.\n- Connect the weapon to a unit template.\n- Run \`validate_federation\`.\n- Test energy, heat and beam behavior in the engine.\n- Replace all placeholder effects and sounds with original assets.\n`;
    const preview = { mode: input.confirm ? 'write' : 'preview', files: {
      'data/mods/warfrontier-federation/stats/weapons.json': { add: { [input.id]: weapon } },
      [`docs/weapons/federation/${input.id}.md`]: specification } };
    if (!input.confirm) return textResult(preview);
    weapons[input.id] = weapon;
    await writeFilesTransaction([
      { path: weaponPath, content: `${JSON.stringify(sortRecord(weapons), null, 2)}\n` },
      { path: specPath, content: specification, mustNotExist: true },
    ]);
    return textResult({ ...preview, transaction: 'committed', written: [path.relative(root, weaponPath), path.relative(root, specPath)],
      next: 'Run validate_federation, connect the weapon to research and a template, then inspect the diff.' });
  });
}
