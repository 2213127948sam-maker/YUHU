import type { DataStatus, StaticBundle, UpdateAttempt } from './types.ts';
import type { Comp } from '../dataProviders/meta/types.ts';
import { compStatus } from '../dataProviders/meta/index.ts';
import { validateDataset } from './validation.ts';
export function getDataStatus(bundle: StaticBundle, comps: Comp[], attempt: UpdateAttempt | null, now = Date.now()) {
  const current = attempt?.observedPatch ?? bundle.patch.data[0];
  const validation = validateDataset(bundle, comps, { allowStale: true, minimumComps: 15 });
  const mismatched = Object.values(bundle).some(d => d.metadata.patch !== current.patch || d.metadata.set !== current.set);
  const staticOld = now - Date.parse(bundle.champions.metadata.collectedAt) > 48 * 3600000;
  const freshComps = comps.filter(c => compStatus(c, current) === 'fresh' && now - Date.parse(c.meta.collectedAt) <= 72 * 3600000);
  const failure = attempt && !attempt.success && Date.parse(attempt.checkedAt) >= Date.parse(bundle.champions.metadata.collectedAt);
  const staticStatus: DataStatus = !validation.ok || failure ? 'error' : mismatched || staticOld ? 'stale' : 'fresh';
  const metaStatus: DataStatus = !validation.ok || !comps.length ? 'error' : freshComps.length < comps.length ? 'stale' : 'fresh';
  return { current, staticStatus, metaStatus, freshComps: freshComps.length, staleComps: comps.length - freshComps.length,
    staticVersionMismatch: mismatched, validation, lastError: failure ? attempt.error : undefined };
}
