import type { Collector } from '../collectors/types.ts';
import type { CompSourceData, SourceStatus } from '../../src/types/terminal.ts';
import { sourceNames } from '../../src/types/terminal.ts';
import { sourceFreshness } from '../../src/utils/sourceFreshness.ts';
import { validateRecords } from '../../src/data/terminalValidation.ts';

export async function collectSource(provider:Collector,set:string,patch:string,now:string,previous:CompSourceData[]){
 const old=previous.filter(r=>r.source===provider.id);
 const base={id:provider.id,name:sourceNames[provider.id],sourceUrl:provider.url,checkedAt:now,method:provider.method};
 try {
  const result=await provider.collect(set,now);validateRecords(result.records);
  if(result.records.some(r=>r.source!==provider.id))throw new Error('Provider 与记录来源不符');
  const fresh=result.records.map(r=>({...r,retained:false,retentionReason:undefined}));
  const key=(r:CompSourceData)=>`${r.set}:${r.patch}:${r.sourceRecordId}`;
  const freshKeys=new Set(fresh.map(key));
  const kept=old.filter(r=>!freshKeys.has(key(r))).map(r=>({...r,retained:true,retentionReason:r.patch===patch?'missing' as const:'version' as const}));
  const collectedAt=fresh.map(r=>r.collectedAt).sort().at(-1);
  const status:SourceStatus={...base,detectedPatch:result.patch,collectedAt,sourceUpdatedAt:result.sourceUpdatedAt,status:sourceFreshness(result.patch,patch,collectedAt,Date.parse(now),result.sourceUpdatedAt),fields:result.fields,message:result.message+(kept.length?` 保留${kept.length}条历史记录，已标记不属于本次采集。`:'')};
  return {records:[...fresh,...kept],status};
 }catch(e){
  const status:SourceStatus={...base,status:'error',detectedPatch:old[0]?.patch,collectedAt:old.map(r=>r.collectedAt).sort().at(-1),fields:[],retained:old.length>0,message:`采集失败：${String(e)}；保留${old.length}条上次有效记录。`};
  return {records:old.map(r=>({...r,retained:true,retentionReason:'error' as const})),status};
 }
}
