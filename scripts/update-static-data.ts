// Static updates always use the complete transaction so versions cannot diverge.
import { updateTerminal } from './update-data.ts';
updateTerminal().catch(e => { console.error(e); process.exitCode = 1; });
