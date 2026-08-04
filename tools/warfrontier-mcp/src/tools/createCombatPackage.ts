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

function assertUnused(record: JsonRecord, id: string, fileName: string): void {
  if (id in record) {
    throw new Error(`Refusing to overwrite existing ID ${id} in ${fileName}.`);
  }
}

export function registerCreateCombatPackageTool(
  server: McpServer,
  resolveRepositoryRoot: ResolveRoot,
  textResult: TextResult,
): void {
  server.registerTool(
    'create_combat_package',
    {
      title: 'Create WarFrontier Combat Package',
      description:
        'Preview or create one complete Federation combat package: body, weapon, research, template and documentation. Writing requires confirm=true.',
      inputSchema: z.object({
        repositoryRoot: z.string().optional(),
        bodyId: z.string().regex(/^FED-H\d{2,3}$/),
        weaponId: z.string().regex(/^FED-WPN-\d{3}$/),
        researchId: z.string().regex(/^FED-RES-\d{3}$/),
        templateId: z.string().regex(/^FED-TPL-[A-Z0-9-]+$/),
        unitName: z.string().min(3).max(100),
        weaponName: z.string().min(3).max(100),
        researchName: z.string().min(3).max(100),
        role: z.string().min(3).max(120),
        description: z.string().min(3).max(500),
        propulsion: z.string().default('hover01'),
        requiredResearch: z.array(z.string()).default([]),
        hitpoints: z.number().int().positive().default(900),
        armourKinetic: z.number().int().nonnegative().default(55),
        armourHeat: z.number().int().nonnegative().default(70),
        bodyBuildPower: z.number().int().positive().default(240),
        bodyBuildPoints: z.number().int().positive().default(520),
        bodyWeight: z.number().int().positive().default(7200),
        energyCapacity: z.number().positive().default(340),
        heatCapacity: z.number().positive().default(120),
        shieldCapacity: z.number().nonnegative().default(220),
        damage: z.number().int().positive().default(58),
        firePause: z.number().int().positive().default(8),
        shortRange: z.number().int().positive().default(896),
        longRange: z.number().int().positive().default(1792),
        energyPerSecond: z.number().nonnegative().default(7),
        heatPerSecond: z.number().nonnegative().default(12),
        maximumDurationSeconds: z.number().positive().default(2.5),
        researchPoints: z.number().int().positive().default(2400),
        researchPower: z.number().int().positive().default(190),
        placeholderBodyModel: z.string().default('Viper.PIE'),
        placeholderWeaponModel: z.string().default('GNMLASER.PIE'),
        placeholderMountModel: z.string().default('TRMLASER.PIE'),
        confirm: z.boolean().default(false),
      }),
    },
    async (input) => {
      if (input.shortRange > input.longRange) {
        throw new Error('shortRange cannot be greater than longRange.');
      }
      if (input.requiredResearch.includes(input.researchId)) {
        throw new Error('A research topic cannot require itself.');
      }

      const root = await resolveRepositoryRoot(input.repositoryRoot);
      const statsRoot = path.join(root, 'data/mods/warfrontier-federation/stats');
      const bodyPath = path.join(statsRoot, 'body.json');
      const weaponPath = path.join(statsRoot, 'weapons.json');
      const researchPath = path.join(statsRoot, 'research.json');
      const templatePath = path.join(statsRoot, 'templates.json');
      const packageDirectory = path.join(root, 'docs/combat-packages/federation');
      const packagePath = path.join(packageDirectory, `${input.templateId}.md`);

      const [bodies, weapons, research, templates] = await Promise.all([
        readJsonObject(bodyPath),
        readJsonObject(weaponPath),
        readJsonObject(researchPath),
        readJsonObject(templatePath),
      ]);

      assertUnused(bodies, input.bodyId, 'body.json');
      assertUnused(weapons, input.weaponId, 'weapons.json');
      assertUnused(research, input.researchId, 'research.json');
      assertUnused(templates, input.templateId, 'templates.json');

      const missingPrerequisites = input.requiredResearch.filter((id) => !(id in research));
      if (missingPrerequisites.length > 0) {
        throw new Error(
          `Missing prerequisite research IDs: ${missingPrerequisites.join(', ')}`,
        );
      }

      const body = {
        armourHeat: input.armourHeat,
        armourKinetic: input.armourKinetic,
        buildPoints: input.bodyBuildPoints,
        buildPower: input.bodyBuildPower,
        class: 'Federation',
        hitpoints: input.hitpoints,
        id: input.bodyId,
        model: input.placeholderBodyModel,
        name: `${input.unitName} Body`,
        powerOutput: Math.round(input.energyCapacity * 100),
        size: 'MEDIUM',
        weaponSlots: 1,
        weight: input.bodyWeight,
        warfrontier: {
          energyCapacity: input.energyCapacity,
          heatCapacity: input.heatCapacity,
          shieldCapacity: input.shieldCapacity,
          status: 'data-prototype',
        },
      };

      const weapon = {
        buildPoints: 420,
        buildPower: 175,
        damage: input.damage,
        designable: 1,
        effectSize: 100,
        explosionWav: 'lrgexpl.ogg',
        facePlayer: 1,
        firePause: input.firePause,
        flightGfx: 'FXLASSAT.PIE',
        flightSpeed: 2500,
        hitGfx: 'FXLASER.PIE',
        hitpoints: 200,
        id: input.weaponId,
        lightWorld: 1,
        longHit: 96,
        longRange: input.longRange,
        maxElevation: 75,
        minElevation: -20,
        minimumDamage: 35,
        missGfx: 'FXLASER.PIE',
        model: input.placeholderWeaponModel,
        mountModel: input.placeholderMountModel,
        movement: 'DIRECT',
        muzzleGfx: 'FXLASER.PIE',
        name: input.weaponName,
        numExplosions: 1,
        recoilValue: 10,
        reloadTime: 0,
        rotate: 180,
        shortHit: 98,
        shortRange: input.shortRange,
        waterGfx: 'FXSSplsh.PIE',
        weaponClass: 'HEAT',
        weaponEffect: 'ANTI TANK',
        weaponSubClass: 'LAS_SAT',
        weaponWav: 'lasstrik.ogg',
        weight: 3200,
        warfrontier: {
          energyPerSecond: input.energyPerSecond,
          heatPerSecond: input.heatPerSecond,
          maximumDurationSeconds: input.maximumDurationSeconds,
          mode: 'continuous-beam-prototype',
          status: 'data-prototype',
        },
      };

      const researchTopic: JsonRecord = {
        iconID: 'IMAGE_RES_WEAPONTECH',
        id: input.researchId,
        keyTopic: 1,
        name: input.researchName,
        researchPoints: input.researchPoints,
        researchPower: input.researchPower,
        resultComponents: [input.bodyId, input.weaponId],
        statID: input.weaponId,
        techCode: 1,
        warfrontier: {
          description: input.description,
          status: 'data-prototype',
        },
      };
      if (input.requiredResearch.length > 0) {
        researchTopic.requiredResearch = input.requiredResearch;
      }

      const template = {
        body: input.bodyId,
        id: input.templateId,
        name: input.unitName,
        propulsion: input.propulsion,
        type: 'DROID',
        weapons: [input.weaponId],
      };

      const specification = `# ${input.unitName}\n\n## Identity\n\n- Template: \`${input.templateId}\`\n- Body: \`${input.bodyId}\`\n- Weapon: \`${input.weaponId}\`\n- Research: \`${input.researchId}\`\n- Role: ${input.role}\n- Description: ${input.description}\n\n## WarFrontier systems\n\n- Energy capacity: ${input.energyCapacity}\n- Heat capacity: ${input.heatCapacity}\n- Shield capacity: ${input.shieldCapacity}\n- Weapon energy consumption: ${input.energyPerSecond}/s\n- Weapon heat generation: ${input.heatPerSecond}/s\n- Maximum beam duration: ${input.maximumDurationSeconds}s\n\n## Validation status\n\nData prototype only. Engine integration, gameplay balance, final models, original effects and runtime testing remain pending.\n`;

      const preview = {
        mode: input.confirm ? 'write' : 'preview',
        package: {
          body: { [input.bodyId]: body },
          weapon: { [input.weaponId]: weapon },
          research: { [input.researchId]: researchTopic },
          template: { [input.templateId]: template },
          documentation: `docs/combat-packages/federation/${input.templateId}.md`,
        },
      };

      if (!input.confirm) {
        return textResult(preview);
      }

      await mkdir(statsRoot, { recursive: true });
      await mkdir(packageDirectory, { recursive: true });
      bodies[input.bodyId] = body;
      weapons[input.weaponId] = weapon;
      research[input.researchId] = researchTopic;
      templates[input.templateId] = template;

      await Promise.all([
        writeFile(bodyPath, `${JSON.stringify(sortRecord(bodies), null, 2)}\n`, 'utf8'),
        writeFile(weaponPath, `${JSON.stringify(sortRecord(weapons), null, 2)}\n`, 'utf8'),
        writeFile(researchPath, `${JSON.stringify(sortRecord(research), null, 2)}\n`, 'utf8'),
        writeFile(templatePath, `${JSON.stringify(sortRecord(templates), null, 2)}\n`, 'utf8'),
        writeFile(packagePath, specification, { encoding: 'utf8', flag: 'wx' }),
      ]);

      return textResult({
        ...preview,
        written: [
          path.relative(root, bodyPath),
          path.relative(root, weaponPath),
          path.relative(root, researchPath),
          path.relative(root, templatePath),
          path.relative(root, packagePath),
        ],
        next: 'Run validate_federation, inspect all generated diffs, compile, and test in game before committing.',
      });
    },
  );
}
