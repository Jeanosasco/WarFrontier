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

export function registerCreateResearchTool(
  server: McpServer,
  resolveRepositoryRoot: ResolveRoot,
  textResult: TextResult,
): void {
  server.registerTool(
    'create_research',
    {
      title: 'Create WarFrontier Research',
      description:
        'Preview or create a Federation research topic and specification document. Writing requires confirm=true.',
      inputSchema: z.object({
        repositoryRoot: z.string().optional(),
        id: z.string().regex(/^FED-RES-\d{3}$/),
        name: z.string().min(3).max(100),
        description: z.string().min(3).max(500),
        iconId: z.string().default('IMAGE_RES_WEAPONTECH'),
        researchPoints: z.number().int().positive().default(1800),
        researchPower: z.number().int().positive().default(140),
        keyTopic: z.union([z.literal(0), z.literal(1)]).default(1),
        techCode: z.number().int().nonnegative().default(1),
        requiredResearch: z.array(z.string()).default([]),
        resultComponents: z.array(z.string()).default([]),
        resultStructures: z.array(z.string()).default([]),
        statId: z.string().optional(),
        confirm: z.boolean().default(false),
      }),
    },
    async (input) => {
      const root = await resolveRepositoryRoot(input.repositoryRoot);
      const statsRoot = path.join(root, 'data/mods/warfrontier-federation/stats');
      const researchPath = path.join(statsRoot, 'research.json');
      const specDirectory = path.join(root, 'docs/research/federation');
      const specPath = path.join(specDirectory, `${input.id}.md`);
      const research = await readJsonObject(researchPath);

      if (input.id in research) {
        throw new Error(`Refusing to overwrite existing research ID: ${input.id}`);
      }

      const duplicateRequirements = input.requiredResearch.filter(
        (value, index, values) => values.indexOf(value) !== index,
      );
      if (duplicateRequirements.length > 0) {
        throw new Error(
          `requiredResearch contains duplicate IDs: ${[...new Set(duplicateRequirements)].join(', ')}`,
        );
      }
      if (input.requiredResearch.includes(input.id)) {
        throw new Error('A research topic cannot require itself.');
      }
      if (input.resultComponents.length === 0 && input.resultStructures.length === 0) {
        throw new Error('At least one result component or structure is required.');
      }

      const topic: JsonRecord = {
        iconID: input.iconId,
        id: input.id,
        keyTopic: input.keyTopic,
        name: input.name,
        researchPoints: input.researchPoints,
        researchPower: input.researchPower,
        techCode: input.techCode,
        warfrontier: {
          description: input.description,
          status: 'data-prototype',
        },
      };

      if (input.requiredResearch.length > 0) {
        topic.requiredResearch = input.requiredResearch;
      }
      if (input.resultComponents.length > 0) {
        topic.resultComponents = input.resultComponents;
      }
      if (input.resultStructures.length > 0) {
        topic.resultStructures = input.resultStructures;
      }
      if (input.statId) {
        topic.statID = input.statId;
      }

      const specification = `# ${input.name}\n\n- Research ID: \`${input.id}\`\n- Faction: Federation\n- Description: ${input.description}\n- Research points: ${input.researchPoints}\n- Research power: ${input.researchPower}\n- Required research: ${input.requiredResearch.length > 0 ? input.requiredResearch.map((id) => `\`${id}\``).join(', ') : 'None'}\n- Result components: ${input.resultComponents.length > 0 ? input.resultComponents.map((id) => `\`${id}\``).join(', ') : 'None'}\n- Result structures: ${input.resultStructures.length > 0 ? input.resultStructures.map((id) => `\`${id}\``).join(', ') : 'None'}\n- Validation status: data prototype; not runtime-tested\n\n## Required follow-up\n\n- Verify every prerequisite ID exists.\n- Verify every result ID exists.\n- Run \`validate_federation\`.\n- Confirm the topic appears in the intended research path.\n- Test unlock behavior in game.\n`;

      const preview = {
        mode: input.confirm ? 'write' : 'preview',
        files: {
          'data/mods/warfrontier-federation/stats/research.json': {
            add: { [input.id]: topic },
          },
          [`docs/research/federation/${input.id}.md`]: specification,
        },
      };

      if (!input.confirm) {
        return textResult(preview);
      }

      await mkdir(statsRoot, { recursive: true });
      await mkdir(specDirectory, { recursive: true });
      research[input.id] = topic;

      await writeFile(researchPath, `${JSON.stringify(sortRecord(research), null, 2)}\n`, 'utf8');
      await writeFile(specPath, specification, { encoding: 'utf8', flag: 'wx' });

      return textResult({
        ...preview,
        written: [path.relative(root, researchPath), path.relative(root, specPath)],
        next: 'Run validate_federation, verify prerequisite/result references, and inspect the diff.',
      });
    },
  );
}
