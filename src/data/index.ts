import rawBundle from './generated/bundle.json';
import rawComps from './curated/comps.json';
import attempt from './update-status.json';
import { staticSchema, compsSchema } from './schema.ts';
import type { UpdateAttempt } from './types.ts';
import { getDataStatus } from './status.ts';
// The UI imports only this normalized repository boundary, never third-party JSON.
export function loadData() {
  const bundle = staticSchema.parse(rawBundle.data[0]);
  const comps = compsSchema.parse(rawComps);
  return { bundle, comps, status: getDataStatus(bundle, comps, attempt as UpdateAttempt) };
}
