import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type JsonRecord = Record<string, unknown>;
type ResolveRoot = (explicitRoot?: string) => Promise<string>;
type TextResult = (value: unknown) => {
  content: Array<{ type: 'text'; text: string }>;
};

async function readJsonObject(filePath: string): Promise<JsonRecord> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filePath, 'utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as JsonRecord;
    }
    throw new Error('JSON root must be an object.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

function sortRecord(record: JsonRecord): JsonRecord {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}

export function registerCreateStructureTool(
  server: McpServer,
  resolveRepositoryRoot: ResolveRoot,
  textResult: TextResult,
): void {
  server.registerTool(
    'create_structure',
    {
      title: 'Create WarFrontier Structure',
      description:
        'Preview or create a Federation structure prototype and specification document. Writing requires confirm=true.',
      inputSchema: z.object({
        repositoryRoot: z.string().optional(),
        id: z.string().regex(/^FED-[A-Z]\d{2,3}$/),
        name: z.string().min(3).max(100),
        role: z.string().min(3).max(120),
        type: z.string().default('DEFENSE'),
        hitpoints: z.number().int().positive().default(2400),
        armour: z.number().int().nonnegative().default(60),
        thermal: z.number().int().nonnegative().default(80),
        resistance: z.number().int().nonnegative().default(220),
        buildPower: z.number().int().positive().default(300),
        buildPoints: z.number().int().positive().default(900),
        width: z.number().int().positive().default(2),
        breadth: z.number().int().positive().default(2),
        height: z.number().int().positive().default(3),
        weaponIds: z.array(z.string()).default([]),
        placeholderModel: z.string().default('A0ADemolishStructure.PIE'),
        shieldCapacity: z.number().nonnegative().default(0),
        shieldRechargePerSecond: z.number().nonnegative().default(0),
        energyPerSecond: z.number().nonnegative().default(0),
        confirm: z.boolean().default(false),
      }),
    },
    async (input) => {
      const root = await resolveRepositoryRoot(input.repositoryRoot);
      const statsRoot = path.join(root, 'data/mods/warfrontier-federation/stats');
      const structurePath = path.join(statsRoot, 'structure.json');
      const specDirectory = path.join(root, 'docs/structures/federation');
      const specPath = path.join(specDirectory, `${input.id}.md`);
      const structures = await readJsonObject(structurePath);

      if (input.id in structures) {
        throw new Error(`Refusing to overwrite existing structure ID: ${input.id}`);
      }

      const duplicateWeapons = input.weaponIds.filter(
        (value, index, values) => values.indexOf(value) !== index,
      );
      if (duplicateWeapons.length > 0) {
        throw new Error(
          `weaponIds contains duplicate IDs: ${[...new Set(duplicateWeapons)].join(', ')}`,
        );
      }

      const structure: JsonRecord = {
        armour: input.armour,
        breadth: input.breadth,
        buildPoints: input.buildPoints,
        buildPower: input.buildPower,
        ecmID: 'ZNULLECM',
        height: input.height,
        hitpoints: input.hitpoints,
        id: input.id,
        name: input.name,
        resistance: input.resistance,
        sensorID: 'DefaultSensor1Mk1',
        strength: 'HARD',
        structureModel: [input.placeholderModel],
        thermal: input.thermal,
        type: input.type,
        width: input.width,
        warfrontier: {
          energyPerSecond: input.energyPerSecond,
          shieldCapacity: input.shieldCapacity,
          shieldRechargePerSecond: input.shieldRechargePerSecond,
          status: 'data-prototype',
        },
      };

      if (input.weaponIds.length > 0) {
        structure.weapons = input.weaponIds;
      }

      const specification = `# ${input.name}\n\n- Structure ID: \`${input.id}\`\n- Faction: Federation\n- Role: ${input.role}\n- Type: \`${input.type}\`\n- Hit points: ${input.hitpoints}\n- Shield capacity: ${input.shieldCapacity}\n- Shield recharge: ${input.shieldRechargePerSecond}/s\n- Energy consumption: ${input.energyPerSecond}/s\n- Weapons: ${input.weaponIds.length > 0 ? input.weaponIds.map((id) => `\`${id}\``).join(', ') : 'None'}\n- Placeholder model: \`${input.placeholderModel}\`\n- Validation status: data prototype; not runtime-tested\n\n## Required follow-up\n\n- Add or verify the research unlock.\n- Verify every weapon reference exists.\n- Run \`validate_federation\`.\n- Test build placement and combat behavior.\n- Replace the placeholder with an original production asset.\n`;

      const preview = {
        mode: input.confirm ? 'write' : 'preview',
        files: {
          'data/mods/warfrontier-federation/stats/structure.json': {
            add: { [input.id]: structure },
          },
          [`docs/structures/federation/${input.id}.md`]: specification,
        },
      };

      if (!input.confirm) {
        return textResult(preview);
      }

      await mkdir(statsRoot, { recursive: true });
      await mkdir(specDirectory, { recursive: true });
      structures[input.id] = structure;

      await writeFile(structurePath, `${JSON.stringify(sortRecord(structures), null, 2)}\n`, 'utf8');
      await writeFile(specPath, specification, { encoding: 'utf8', flag: 'wx' });

      return textResult({
        ...preview,
        written: [path.relative(root, structurePath), path.relative(root, specPath)],
        next: 'Run validate_federation, verify weapon and research references, and inspect the diff.',
      });
    },
  );
}
