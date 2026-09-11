import path from 'node:path';
import { getCurrentPatch } from '../../src/dataProviders/riotPatch.ts';
import { getStaticData } from '../../src/dataProviders/communityDragon.ts';
import { ProviderError } from '../../src/dataProviders/http.ts';
import { validateDataset } from '../../src/data/validation.ts';
import { DATA_DIR, readJson, commitBundle, writeAttempt, withUpdateLock } from './storage.ts';
import type { UpdateAttempt } from '../../src/data/types.ts';
import type { Comp } from '../../src/dataProviders/meta/types.ts';

export async function updateAll() {
  await withUpdateLock(async () => {
    let observed: UpdateAttempt['observedPatch'];
    let provider = 'RiotPatch';
    try {
      console.log('TFT DATA UPDATE\nChecking official TFT patch...');
      const patch = await getCurrentPatch(p => { observed = p; });
      console.log(`Set: ${patch.data[0].set}\nPatch: ${patch.data[0].patch}\nResources: ${patch.data[0].resourceVersion}`);
      provider = 'CommunityDragon';
      console.log('Downloading and normalizing current live Set...');
      const bundle = { ...await getStaticData(patch.data[0]), patch };
      // Guard against /latest moving during a download; no mixed-resource commit.
      const { fetchDocument, parseJson } = await import('../../src/dataProviders/http.ts');
      const release = parseJson<{ version: string }>(await fetchDocument(patch.data[0].resourceMetadataUrl, provider), provider);
      if (!release.version.startsWith(patch.data[0].resourceVersion.split('.').slice(0, 2).join('.') + '.'))
        throw new Error('资源分支在下载期间变化，请重试');
      provider = 'CuratedMeta';
      const comps = await readJson<Comp[]>(path.join(DATA_DIR, 'curated/comps.json'));
      provider = 'Validation';
      const validation = validateDataset(bundle, comps, { allowStale: true, minimumComps: 15 });
      if (!validation.ok) throw new Error(validation.errors.join('\n'));
      provider = 'DataStore';
      await commitBundle(bundle);
      await writeAttempt({ checkedAt: new Date().toISOString(), success: true, observedPatch: observed });
      for (const key of ['champions', 'traits', 'items', 'augments'] as const) console.log(`${key}: ${bundle[key].data.length}`);
      console.log(`Meta comps: ${comps.length} (${comps.length - validation.staleCompIds.length} fresh / ${validation.staleCompIds.length} stale)`);
      console.log('Static data: PASS');
      console.log(`Comp references: ${validation.staleCompIds.length ? 'PASS for current comps; stale references quarantined' : 'PASS'}`);
      console.log(`Patch validation: ${validation.staleCompIds.length ? 'STALE META (preserved, excluded from strength evidence)' : 'PASS'}`);
      console.log(`Updated: ${bundle.champions.metadata.collectedAt}`);
    } catch (error) {
      const actualProvider = error instanceof ProviderError ? error.provider : provider;
      const message = error instanceof Error ? error.message : String(error);
      await writeAttempt({ checkedAt: new Date().toISOString(), success: false, provider: actualProvider, error: message, observedPatch: observed });
      console.error(`DATA UPDATE FAILED\nProvider: ${actualProvider}\n${message}\nLast-known-good generated data preserved.`);
      throw error;
    }
  });
}
