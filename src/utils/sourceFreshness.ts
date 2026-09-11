import type { Freshness } from '../types/terminal';
export function sourceFreshness(patch:string|undefined,current:string,collectedAt?:string,now=Date.now(),sourceUpdatedAt?:string):Freshness {
 if(!patch||!collectedAt) return 'unknown';
 if(patch.toLowerCase()!==current.toLowerCase()) return 'stale';
 const times=[collectedAt,...sourceUpdatedAt?[sourceUpdatedAt]:[]].map(Date.parse);
 if(times.some(t=>!Number.isFinite(t)||t>now+300000)) return 'unknown';
 return times.some(t=>now-t>24*3600000)?'stale':'fresh';
}
