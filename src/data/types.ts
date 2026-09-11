export interface Metadata {
  source: string; sourceUrl: string; set: string; patch: string;
  collectedAt: string; schemaVersion: number;
  sourceVersion?: string; sha256?: string; lastModified?: string;
  supportingSources?: string[];
}
export interface GeneratedDataset<T> { metadata: Metadata; data: T[] }
export interface NamedEntity { id: string; apiName: string; name: string; icon?: string }
export interface Champion extends NamedEntity { cost: number; traits: string[] }
export interface Trait extends NamedEntity { description?: string }
export interface Item extends NamedEntity { description?: string; category?: string; effects?: Record<string, number> }
export interface Augment extends NamedEntity { description?: string; tier?: string }
export interface PatchInfo {
  set: string; patch: string; releasedAt?: string; patchNotesUrl?: string; checkedAt: string;
  resourceVersion: string; resourcePublishedAt: string; resourceMetadataUrl: string;
  patchAssociation: string;
}
export interface StaticBundle {
  champions: GeneratedDataset<Champion>; traits: GeneratedDataset<Trait>;
  items: GeneratedDataset<Item>; augments: GeneratedDataset<Augment>;
  patch: GeneratedDataset<PatchInfo>;
}
export type DataStatus = 'fresh' | 'stale' | 'error';
export interface UpdateAttempt {
  checkedAt: string; success: boolean; provider?: string; error?: string;
  observedPatch?: Pick<PatchInfo, 'set' | 'patch' | 'checkedAt'>;
}
export interface AugmentStrategyMetadata {
  augmentId: string;
  type?: 'economy' | 'combat' | 'reroll' | 'trait' | 'item' | 'flexible';
  tempoImpact?: 0 | 1 | 2 | 3; tags?: string[];
}
