import { getCurrentPatch } from '../src/dataProviders/riotPatch.ts';
import { withUpdateLock, writeAttempt } from './lib/storage.ts';
import type { UpdateAttempt } from '../src/data/types.ts';
withUpdateLock(async () => {
  let observed: UpdateAttempt['observedPatch'];
  try {
    const patch = await getCurrentPatch(p => { observed = p; });
    // Detection is persisted outside generated. It never relabels old static data.
    await writeAttempt({ checkedAt: new Date().toISOString(), success: true, observedPatch: observed });
    console.log(JSON.stringify(patch.data[0], null, 2));
  } catch (error) {
    await writeAttempt({ checkedAt: new Date().toISOString(), success: false, provider: 'RiotPatch', error: String(error), observedPatch: observed });
    throw error;
  }
}).catch(e => { console.error('DATA UPDATE FAILED\n' + String(e)); process.exitCode = 1; });
