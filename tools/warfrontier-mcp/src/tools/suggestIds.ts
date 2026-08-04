import { readFile } from 'node:fs/promises';
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

function nextNumericId(keys: string[], prefix: string, width: number): string {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\d+)$`);
  const used = new Set<number>();

  for (const key of keys) {
    const match = pattern.exec(key);
    if (match) {
      used.add(Number.parseInt(match[1], 10));
    }
  }

  let candidate = 1;
  while (used.has(candidate)) {
    candidate += 1;
  }

  return `${prefix}${candidate.toString().padStart(width, '0')}`;
}

function nextTemplateId(keys: string[], suggestedBodyId: string): string {
  const bodySuffix = suggestedBodyId.replace(/^FED-H/, '');
  const preferred = `FED-TPL-H${bodySuffix}`;
  if (!keys.includes(preferred)) {
    return preferred;
  }

  return nextNumericId(keys, 'FED-TPL-', 3);
}

export function registerSuggestIdsTool(
  server: McpServer,
  resolveRepositoryRoot: ResolveRoot,
  textResult: TextResult,
): void {
  server.registerTool(
    'suggest_ids',
    {
      title: 'Suggest WarFrontier IDs',
      description:
        'Read Federation data files and return the next available IDs without modifying the repository.',
      inputSchema: z.object({
        repositoryRoot: z.string().optional(),
      }),
    },
    async ({ repositoryRoot }) => {
      const root = await resolveRepositoryRoot(repositoryRoot);
      const statsRoot = path.join(root, 'data/mods/warfrontier-federation/stats');

      const [bodies, weapons, research, structures, templates] = await Promise.all([
        readJsonObject(path.join(statsRoot, 'body.json')),
        readJsonObject(path.join(statsRoot, 'weapons.json')),
        readJsonObject(path.join(statsRoot, 'research.json')),
        readJsonObject(path.join(statsRoot, 'structure.json')),
        readJsonObject(path.join(statsRoot, 'templates.json')),
      ]);

      const bodyId = nextNumericId(Object.keys(bodies), 'FED-H', 2);
      const weaponId = nextNumericId(Object.keys(weapons), 'FED-WPN-', 3);
      const researchId = nextNumericId(Object.keys(research), 'FED-RES-', 3);
      const structureId = nextNumericId(Object.keys(structures), 'FED-D', 2);
      const templateId = nextTemplateId(Object.keys(templates), bodyId);

      return textResult({
        repositoryRoot: root,
        suggested: {
          bodyId,
          weaponId,
          researchId,
          structureId,
          templateId,
        },
        counts: {
          bodies: Object.keys(bodies).length,
          weapons: Object.keys(weapons).length,
          research: Object.keys(research).length,
          structures: Object.keys(structures).length,
          templates: Object.keys(templates).length,
        },
        note: 'Suggestions are read-only and must still be checked again immediately before writing.',
      });
    },
  );
}
