import { createHash } from 'node:crypto';
import type { Comp,CompSourceData } from '../../src/types/terminal.ts';
import type { StaticBundle } from '../../src/data/types.ts';
export const normalizeName=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
// Reviewed exact aliases only. Similar carry names alone never justify merging variants.
const aliases: string[][] = [['Draven Fast 9','Draven AD 9'],['Sivir Hunters','hunter sivir'],['Vanguard Aphelios','vanguard aphelios'],['Elderwood Aphelios','elderwood aphelios'],['Spellweaver Ahri','spellweaver ahri'],['Defender Cassiopeia','defender cassiopeia'],['Tristana Reroll','tristana reroll']];
const aliasKey=(s:string)=>aliases.find(a=>a.some(n=>normalizeName(n)===normalizeName(s)))?.[0]??s;
export function normalizeComps(records:CompSourceData[],bundle:StaticBundle):Comp[] {
 const map=new Map<string,Comp>();const units=new Map(bundle.champions.data.map(c=>[c.id,c]));
 for(const raw of records){
  const r={...raw,notes:[...raw.notes]};
  const key=r.set+':'+normalizeName(aliasKey(r.name));
  let target=map.get(key);
  // Same source duplicates and differing known core sets remain separate.
  if(target&&(target.sources.some(s=>s.source===r.source&&s.sourceRecordId!==r.sourceRecordId)||(target.carries.length&&r.carries?.length&&!target.carries.some(u=>r.carries!.includes(u))))) target=undefined;
  const valid=(ids:string[]=[])=>ids.filter(id=>units.has(id));
  const dropped=(r.coreUnits??[]).filter(id=>!units.has(id));
  if(dropped.length)r.notes.push(`来源含当前静态库未收录的形态/召唤物，未并入英雄列表：${dropped.join(', ')}`);
  if(!target){const actualKey=map.has(key)?`${key}:${r.source}:${r.sourceRecordId}`:key;target={id:'comp-'+createHash('sha256').update(actualKey).digest('hex').slice(0,16),name:r.name,aliases:[r.name],set:r.set,archetype:r.archetype??'unknown',coreUnits:valid(r.coreUnits),carries:valid(r.carries),tanks:valid(r.tanks),traits:[],sources:[],updatedAt:r.collectedAt};map.set(actualKey,target);}
  if(target.sources.some(s=>s.source===r.source&&s.sourceRecordId===r.sourceRecordId&&s.patch===r.patch))throw new Error('重复来源快照');
  target.sources.push(r);target.aliases=[...new Set([...target.aliases,r.name])];
  if(!target.coreUnits.length)target.coreUnits=valid(r.coreUnits);
  if(!target.carries.length)target.carries=valid(r.carries);
  if(!target.tanks.length)target.tanks=valid(r.tanks);
  if(target.archetype==='unknown')target.archetype=r.archetype??'unknown';
  target.traits=[...new Set(target.coreUnits.flatMap(u=>units.get(u)?.traits??[]))];
  target.updatedAt=[target.updatedAt,r.collectedAt].sort().at(-1)!;
 }
 return [...map.values()];
}
