import { provenance } from '../../src/types/terminal.ts';
import type { StaticBundle } from '../../src/data/types.ts';
export const normalizeAugments=(bundle:StaticBundle)=>bundle.augments.data.map(a=>({...a,provenance:provenance(bundle.augments.metadata),sources:[]}));
