import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

type JsonRecord = Record<string, unknown>;
type ResolveRoot = (explicitRoot?: string) => Promise<string>;
type TextResult = (value: unknown) => {
  content: Array<{ type: 'text'; text: string }>;
};

type BrokenReference = {
  sourceType: string;
  sourceId: string;
  field: string;
  targetId: string;
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

function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function collectPlaceholderIds(record: JsonRecord): string[] {
  const placeholderPattern = /(viper|gnmlaser|trmlaser|fxlaser|a0ademolish|placeholder)/i;
  return Object.entries(record)
    .filter(([, value]) => placeholderPattern.test(JSON.stringify(value)))
    .map(([id]) => id)
    .sort();
}

export function registerAnalyzeFederationTool(
  server: McpServer,
  resolveRepositoryRoot: ResolveRoot,
  textResult: TextResult,
): void {
  server.registerTool(
    'analyze_federation',
    {
      title: 'Analyze Federation Dependencies',
      description:
        'Analyze Federation bodies, weapons, structures, research and templates for broken references, orphaned content and placeholder assets. This tool is read-only.',
      inputSchema: z.object({
        repositoryRoot: z.string().optional(),
      }),
    },
    async ({ repositoryRoot }) => {
      const root = await resolveRepositoryRoot(repositoryRoot);
      const statsRoot = path.join(root, 'data/mods/warfrontier-federation/stats');

      const [bodies, weapons, structures, research, templates] = await Promise.all([
        readJsonObject(path.join(statsRoot, 'body.json')),
        readJsonObject(path.join(statsRoot, 'weapons.json')),
        readJsonObject(path.join(statsRoot, 'structure.json')),
        readJsonObject(path.join(statsRoot, 'research.json')),
        readJsonObject(path.join(statsRoot, 'templates.json')),
      ]);

      const bodyIds = new Set(Object.keys(bodies));
      const weaponIds = new Set(Object.keys(weapons));
      const structureIds = new Set(Object.keys(structures));
      const researchIds = new Set(Object.keys(research));
      const referencedBodies = new Set<string>();
      const referencedWeapons = new Set<string>();
      const referencedStructures = new Set<string>();
      const unlockedComponents = new Set<string>();
      const brokenReferences: BrokenReference[] = [];

      for (const [templateId, rawTemplate] of Object.entries(templates)) {
        const template = asRecord(rawTemplate);
        if (!template) continue;

        const bodyId = typeof template.body === 'string' ? template.body : null;
        if (bodyId) {
          referencedBodies.add(bodyId);
          if (!bodyIds.has(bodyId)) {
            brokenReferences.push({
              sourceType: 'template',
              sourceId: templateId,
              field: 'body',
              targetId: bodyId,
            });
          }
        }

        for (const weaponId of asStringArray(template.weapons)) {
          referencedWeapons.add(weaponId);
          if (!weaponIds.has(weaponId)) {
            brokenReferences.push({
              sourceType: 'template',
              sourceId: templateId,
              field: 'weapons',
              targetId: weaponId,
            });
          }
        }
      }

      for (const [structureId, rawStructure] of Object.entries(structures)) {
        const structure = asRecord(rawStructure);
        if (!structure) continue;

        for (const weaponId of asStringArray(structure.weapons)) {
          referencedWeapons.add(weaponId);
          if (!weaponIds.has(weaponId)) {
            brokenReferences.push({
              sourceType: 'structure',
              sourceId: structureId,
              field: 'weapons',
              targetId: weaponId,
            });
          }
        }
      }

      const researchWithoutResults: string[] = [];
      for (const [researchId, rawResearch] of Object.entries(research)) {
        const topic = asRecord(rawResearch);
        if (!topic) continue;

        const resultComponents = asStringArray(topic.resultComponents);
        const resultStructures = asStringArray(topic.resultStructures);
        if (resultComponents.length === 0 && resultStructures.length === 0) {
          researchWithoutResults.push(researchId);
        }

        for (const prerequisiteId of asStringArray(topic.requiredResearch)) {
          if (!researchIds.has(prerequisiteId)) {
            brokenReferences.push({
              sourceType: 'research',
              sourceId: researchId,
              field: 'requiredResearch',
              targetId: prerequisiteId,
            });
          }
        }

        for (const componentId of resultComponents) {
          unlockedComponents.add(componentId);
          if (!bodyIds.has(componentId) && !weaponIds.has(componentId)) {
            brokenReferences.push({
              sourceType: 'research',
              sourceId: researchId,
              field: 'resultComponents',
              targetId: componentId,
            });
          }
        }

        for (const resultStructureId of resultStructures) {
          referencedStructures.add(resultStructureId);
          if (!structureIds.has(resultStructureId)) {
            brokenReferences.push({
              sourceType: 'research',
              sourceId: researchId,
              field: 'resultStructures',
              targetId: resultStructureId,
            });
          }
        }
      }

      const orphanBodies = [...bodyIds].filter((id) => !referencedBodies.has(id)).sort();
      const orphanWeapons = [...weaponIds].filter((id) => !referencedWeapons.has(id)).sort();
      const structuresWithoutResearch = [...structureIds]
        .filter((id) => !referencedStructures.has(id))
        .sort();
      const componentsWithoutResearch = [...bodyIds, ...weaponIds]
        .filter((id) => !unlockedComponents.has(id))
        .sort();

      const placeholders = {
        bodies: collectPlaceholderIds(bodies),
        weapons: collectPlaceholderIds(weapons),
        structures: collectPlaceholderIds(structures),
      };

      const issueCount =
        brokenReferences.length +
        orphanBodies.length +
        orphanWeapons.length +
        researchWithoutResults.length +
        structuresWithoutResearch.length +
        componentsWithoutResearch.length;

      return textResult({
        repositoryRoot: root,
        healthy: issueCount === 0,
        counts: {
          bodies: bodyIds.size,
          weapons: weaponIds.size,
          structures: structureIds.size,
          research: researchIds.size,
          templates: Object.keys(templates).length,
          issues: issueCount,
        },
        brokenReferences,
        orphaned: {
          bodies: orphanBodies,
          weapons: orphanWeapons,
        },
        researchWithoutResults: researchWithoutResults.sort(),
        componentsWithoutResearch,
        structuresWithoutResearch,
        placeholders,
        note:
          'Orphan and unlock findings are structural warnings, not proof that content is invalid; review intentional prototypes manually.',
      });
    },
  );
}
