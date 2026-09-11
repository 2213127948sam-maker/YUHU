import { z } from 'zod';
const text = z.string().trim().min(1);
const date = z.iso.datetime({ offset: true });
const url = z.url().refine(s => s.startsWith('https://'), '来源必须为 HTTPS URL');
export const metadataSchema = z.object({
  source: text, sourceUrl: url, set: text, patch: text, collectedAt: date,
  schemaVersion: z.literal(1), sourceVersion: text.optional(), sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  lastModified: text.optional(), supportingSources: z.array(url).optional(),
});
const entity = z.object({ id: text, apiName: text, name: text, icon: url.optional() });
const champion = entity.extend({ cost: z.number().int().min(1).max(5), traits: z.array(text).min(1) });
const trait = entity.extend({ description: z.string().optional() });
const item = trait.extend({ category: text.optional(), effects: z.record(z.string(), z.number()).optional() });
const augment = trait.extend({ tier: z.enum(['silver', 'gold', 'prismatic']).optional() });
export const patchInfoSchema = z.object({
  set: text, patch: text, releasedAt: date.optional(), patchNotesUrl: url.optional(), checkedAt: date,
  resourceVersion: text, resourcePublishedAt: date, resourceMetadataUrl: url, patchAssociation: text,
});
const dataset = <T extends z.ZodType>(schema: T) => z.object({ metadata: metadataSchema, data: z.array(schema).min(1) });
export const staticSchema = z.object({
  champions: dataset(champion), traits: dataset(trait), items: dataset(item), augments: dataset(augment),
  patch: dataset(patchInfoSchema).extend({ data: z.array(patchInfoSchema).length(1) }),
});
export const compSchema = z.object({
  id: text, name: text, patch: text, set: text,
  archetype: z.enum(['reroll1', 'reroll2', 'reroll3', 'fast8', 'fast9', 'tempo']),
  coreUnits: z.array(text).min(1), optionalUnits: z.array(text), carries: z.array(text).min(1), tanks: z.array(text).min(1),
  preferredItems: z.array(z.object({ unitId: text, items: z.array(text).min(1).max(3) })).optional(),
  preferredAugments: z.array(text).optional(), defaultRollLevel: z.number().int().min(2).max(10), tags: z.array(text),
  requirements: z.array(text).optional(),
  curation: z.object({ reviewedAt: date, rationale: text, archetypeBasis: text, caveats: z.array(text) }),
  meta: z.object({
    avgPlacement: z.number().min(1).max(8).optional(),
    top4Rate: z.number().min(0).max(1).optional(), winRate: z.number().min(0).max(1).optional(),
    playRate: z.number().min(0).max(1).optional(), sampleSize: z.number().int().nonnegative().optional(),
    collectedAt: date, incompleteBoards: z.number().int().nonnegative().optional(),
    representativeLevel: z.number().int().min(1).max(10).optional(),
    sources: z.array(z.object({
      name: text, url, patch: text, collectedAt: date, snapshot: text.optional(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/).optional(), rank: text.optional(),
      windowHours: z.number().int().positive().optional(), sampleScope: text.optional(),
    })).min(1),
  }),
});
export const compsSchema = z.array(compSchema);
