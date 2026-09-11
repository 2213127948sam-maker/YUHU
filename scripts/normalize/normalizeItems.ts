import { provenance } from '../../src/types/terminal.ts';
import type { StaticBundle } from '../../src/data/types.ts';
export const normalizeItems=(bundle:StaticBundle)=>bundle.items.data.map(a=>({...a,provenance:provenance(bundle.items.metadata),sources:[]}));
