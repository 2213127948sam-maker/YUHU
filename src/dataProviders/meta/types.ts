import type { DataStatus } from '../../data/types.ts';
export type Archetype = 'reroll1' | 'reroll2' | 'reroll3' | 'fast8' | 'fast9' | 'tempo';
export interface MetaSource {
  name: string; url: string; patch: string; collectedAt: string;
  snapshot?: string; sha256?: string; rank?: string; windowHours?: number;
  sampleScope?: string;
}
export interface Comp {
  id: string; name: string; patch: string; set: string; archetype: Archetype;
  coreUnits: string[]; optionalUnits: string[]; carries: string[]; tanks: string[];
  preferredItems?: { unitId: string; items: string[] }[];
  preferredAugments?: string[]; defaultRollLevel: number; tags: string[];
  requirements?: string[];
  curation: { reviewedAt: string; rationale: string; archetypeBasis: string; caveats: string[] };
  meta: {
    avgPlacement?: number; top4Rate?: number; winRate?: number; playRate?: number; sampleSize?: number;
    collectedAt: string; sources: MetaSource[];
    incompleteBoards?: number; representativeLevel?: number;
  };
}
export interface NormalizedCompMeta extends Comp { status: DataStatus }
export interface MetaProvider { getComps(): Promise<NormalizedCompMeta[]> }
