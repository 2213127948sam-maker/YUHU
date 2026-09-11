import type { PatchInfo } from '../../data/types.ts';
import type { Comp, MetaProvider, NormalizedCompMeta } from './types.ts';
export function compStatus(comp: Comp, patch: Pick<PatchInfo, 'set' | 'patch'>): 'fresh' | 'stale' {
  return comp.patch === patch.patch && comp.set === patch.set &&
    comp.meta.sources.every(s => s.patch === comp.patch) ? 'fresh' : 'stale';
}
export function normalizeCompMeta(comp: Comp, patch: Pick<PatchInfo, 'set' | 'patch'>): NormalizedCompMeta {
  return { ...comp, status: compStatus(comp, patch) };
}
export class CuratedMetaProvider implements MetaProvider {
  private readonly comps: Comp[];
  private readonly patch: Pick<PatchInfo, 'set' | 'patch'>;
  constructor(comps: Comp[], patch: Pick<PatchInfo, 'set' | 'patch'>) { this.comps = comps; this.patch = patch; }
  async getComps(): Promise<NormalizedCompMeta[]> { return this.comps.map(c => normalizeCompMeta(c, this.patch)); }
}
