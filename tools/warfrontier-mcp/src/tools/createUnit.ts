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

export function registerCreateUnitTool(server: McpServer, resolveRepositoryRoot: ResolveRoot, textResult: TextResult): void {
  server.registerTool('create_unit', {
    title: 'Create WarFrontier Unit',
    description: 'Preview or create a Federation body, vehicle template and specification document. Writing requires confirm=true.',
    inputSchema: z.object({
      repositoryRoot: z.string().optional(), id: z.string().regex(/^FED-H\d{2,3}$/),
      templateId: z.string().regex(/^FED-TPL-[A-Z0-9-]+$/), name: z.string().min(3).max(80),
      role: z.string().min(3).max(80), weaponId: z.string().regex(/^FED-WPN-\d{3}$/),
      propulsion: z.string().default('hover01'), hitpoints: z.number().int().positive().default(720),
      armourKinetic: z.number().int().nonnegative().default(45), armourHeat: z.number().int().nonnegative().default(55),
      buildPower: z.number().int().positive().default(190), buildPoints: z.number().int().positive().default(420),
      weight: z.number().int().positive().default(5800), energyCapacity: z.number().positive().default(280),
      heatCapacity: z.number().positive().default(100), shieldCapacity: z.number().nonnegative().default(180),
      placeholderModel: z.string().default('Viper.PIE'), confirm: z.boolean().default(false),
    }),
  }, async (input) => {
    const root = await resolveRepositoryRoot(input.repositoryRoot);
    const statsRoot = path.join(root, 'data/mods/warfrontier-federation/stats');
    const bodyPath = path.join(statsRoot, 'body.json');
    const templatePath = path.join(statsRoot, 'templates.json');
    const specPath = path.join(root, 'docs/units/federation', `${input.id}.md`);
    const [bodies, templates] = await Promise.all([readJsonObject(bodyPath), readJsonObject(templatePath)]);
    const duplicateIds = [input.id in bodies ? input.id : null, input.templateId in templates ? input.templateId : null]
      .filter((value): value is string => value !== null);
    if (duplicateIds.length) throw new Error(`Refusing to overwrite existing IDs: ${duplicateIds.join(', ')}`);

    const body = { armourHeat: input.armourHeat, armourKinetic: input.armourKinetic, buildPoints: input.buildPoints,
      buildPower: input.buildPower, class: 'Federation', hitpoints: input.hitpoints, id: input.id,
      model: input.placeholderModel, name: `${input.name} Body`, powerOutput: Math.round(input.energyCapacity * 100),
      size: 'MEDIUM', weaponSlots: 1, weight: input.weight,
      warfrontier: { energyCapacity: input.energyCapacity, heatCapacity: input.heatCapacity,
        shieldCapacity: input.shieldCapacity, status: 'data-prototype' } };
    const template = { body: input.id, id: input.templateId, name: input.name, propulsion: input.propulsion,
      type: 'DROID', weapons: [input.weaponId] };
    const specification = `# ${input.name}\n\n- Unit ID: \`${input.id}\`\n- Template ID: \`${input.templateId}\`\n- Faction: Federation\n- Role: ${input.role}\n- Propulsion: \`${input.propulsion}\`\n- Weapon: \`${input.weaponId}\`\n- Energy capacity: ${input.energyCapacity}\n- Heat capacity: ${input.heatCapacity}\n- Shield capacity: ${input.shieldCapacity}\n- Placeholder model: \`${input.placeholderModel}\`\n- Validation status: data prototype; not runtime-tested\n\n## Required follow-up\n\n- Add or verify research unlocks.\n- Verify weapon compatibility.\n- Run \`validate_federation\`.\n- Build and test in game.\n- Replace the placeholder with an original production asset.\n`;
    const preview = { mode: input.confirm ? 'write' : 'preview', files: {
      'data/mods/warfrontier-federation/stats/body.json': { add: { [input.id]: body } },
      'data/mods/warfrontier-federation/stats/templates.json': { add: { [input.templateId]: template } },
      [`docs/units/federation/${input.id}.md`]: specification } };
    if (!input.confirm) return textResult(preview);
    bodies[input.id] = body; templates[input.templateId] = template;
    await writeFilesTransaction([
      { path: bodyPath, content: `${JSON.stringify(sortRecord(bodies), null, 2)}\n` },
      { path: templatePath, content: `${JSON.stringify(sortRecord(templates), null, 2)}\n` },
      { path: specPath, content: specification, mustNotExist: true },
    ]);
    return textResult({ ...preview, transaction: 'committed', written: [path.relative(root, bodyPath), path.relative(root, templatePath), path.relative(root, specPath)],
      next: 'Run validate_federation and inspect the generated diff before committing.' });
  });
}
