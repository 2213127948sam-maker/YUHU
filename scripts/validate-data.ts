import path from 'node:path';
import { validateTerminal } from '../src/data/terminalValidation.ts';
import { staticSchema } from '../src/data/schema.ts';
import type { UnifiedTFTData } from '../src/types/terminal.ts';
import { DATA_DIR, readBundle, readJson, exists } from './lib/storage.ts';
import type { UpdateAttempt } from '../src/data/types.ts';
try {
  const bundle = await readBundle();
  staticSchema.parse(bundle);
  const terminal = await readJson<UnifiedTFTData>(path.join(DATA_DIR,'generated/unified-data.json'));
  validateTerminal(terminal);
  const attemptFile = path.join(DATA_DIR, 'update-status.json');
  const attempt = await exists(attemptFile) ? await readJson<UpdateAttempt>(attemptFile) : null;
  if(attempt?.observedPatch&&attempt.observedPatch.patch!==terminal.metadata.patch)throw new Error('已检测到新官方版本，当前统一快照尚未同步');
  for(const kind of ['champions','traits','items','augments'] as const){const stripped=terminal[kind].map(({provenance,sources,...e}:any)=>e);if(JSON.stringify(stripped)!==JSON.stringify(bundle[kind].data))throw new Error(`${kind} 与 bundle 不一致`);}
  const comps=await readJson(path.join(DATA_DIR,'generated/comps.json')),sources=await readJson(path.join(DATA_DIR,'generated/source-status.json'));
  if(JSON.stringify(comps)!==JSON.stringify(terminal.comps)||JSON.stringify(sources)!==JSON.stringify(terminal.sourceStatus))throw new Error('统一入口与分类文件不一致');
  console.log(JSON.stringify({ok:true,patch:terminal.metadata.patch,comps:terminal.comps.length,sourceStatus:terminal.sourceStatus.map(s=>({source:s.name,status:s.status}))},null,2));
} catch (e) { console.error('DATA VALIDATION FAILED\n' + String(e)); process.exitCode = 1; }
