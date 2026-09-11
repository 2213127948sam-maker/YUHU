import { z } from 'zod';
import type { UnifiedTFTData,CompSourceData } from '../types/terminal';
const date=z.iso.datetime({offset:true}); const text=z.string().min(1);
const p=z.object({source:text,sourceUrl:z.url().refine(u=>u.startsWith('https://')),set:text,patch:z.string().regex(/^\d+\.\d+[a-z]?$/i),collectedAt:date,sourceUpdatedAt:date.optional()});
const sourceIds=['riot','communityDragon','datatft','tftacademy','metatft','tftable','tftflow'];
const hosts:Record<string,string>= {datatft:'datatft.com',tftacademy:'tftacademy.com',metatft:'metatft.com',tftable:'tftable.cc',tftflow:'tftflow.com'};
export const recordSchema=p.extend({source:z.enum(['datatft','tftacademy','metatft','tftable','tftflow']),sourceRecordId:text,name:text,notes:z.array(z.string()),tier:text.optional(),avgPlacement:z.number().min(1).max(8).optional(),playRate:z.number().min(0).max(1).optional(),top4Rate:z.number().min(0).max(1).optional(),winRate:z.number().min(0).max(1).optional(),sampleSize:z.number().int().nonnegative().optional()});
export function validateRecords(records:CompSourceData[]){
 const seen=new Set<string>();
 for(const r of records){recordSchema.parse(r);const key=[r.source,r.set,r.patch,r.sourceRecordId].join(':');if(seen.has(key))throw new Error('重复来源快照');seen.add(key);
 const host=new URL(r.sourceUrl).hostname;if(host!==hosts[r.source]&&host!==`www.${hosts[r.source]}`)throw new Error('来源 URL 与 Provider 不一致');
 if(r.set!==r.patch.split('.')[0])throw new Error('来源 Set/Patch 不一致');
 for(const key of ['coreUnits','carries','tanks'] as const)if(r[key])z.array(text).parse(r[key]);
 if(r.trendDelta!==undefined)z.number().finite().parse(r.trendDelta);
 }
}
export function validateTerminal(data:UnifiedTFTData){
 z.object({set:text,patch:text,generatedAt:date,schemaVersion:z.literal(1)}).parse(data.metadata);p.parse(data.patch);
 if(data.patch.patch!==data.metadata.patch||data.patch.set!==data.metadata.set)throw new Error('统一入口与官方版本不一致');
 const ids=new Set<string>();
 for(const kind of ['champions','traits','items','augments'] as const){if(!data[kind].length)throw new Error(`${kind} 为空`);const seen=new Set<string>();for(const e of data[kind]){if(seen.has(e.id))throw new Error('重复静态ID');seen.add(e.id);p.parse(e.provenance);if(e.provenance.patch!==data.metadata.patch)throw new Error('静态版本混用');}}
 const championIds=new Set(data.champions.map(c=>c.id)),traitIds=new Set(data.traits.map(c=>c.id));
 for(const c of data.champions){z.number().int().min(1).max(5).parse(c.cost);if(c.traits.some(t=>!traitIds.has(t)))throw new Error('悬空英雄羁绊');}
 for(const c of data.comps){if(ids.has(c.id))throw new Error('重复阵容ID');ids.add(c.id);if(!c.sources.length)throw new Error('阵容缺少来源');validateRecords(c.sources);text.parse(c.name);date.parse(c.updatedAt);if(c.sources.some(s=>s.set!==c.set))throw new Error('阵容跨赛季合并');if([...c.coreUnits,...c.carries,...c.tanks].some(u=>!championIds.has(u))||c.traits.some(t=>!traitIds.has(t)))throw new Error('阵容存在悬空引用');}
 validateRecords(data.comps.flatMap(c=>c.sources));
 const statusIds=new Set(data.sourceStatus.map(s=>s.id));if(data.sourceStatus.length!==7||statusIds.size!==7||sourceIds.some(id=>!statusIds.has(id as any)))throw new Error('必须保留七个来源状态');
 for(const s of data.sourceStatus){date.parse(s.checkedAt);z.enum(['fresh','stale','unknown','error']).parse(s.status);if(s.status==='fresh'&&(s.detectedPatch!==data.metadata.patch||!s.collectedAt))throw new Error('错误标记 Fresh');}
 for(const kind of ['items','augments'] as const)for(const e of data[kind])for(const s of e.sources??[])p.parse(s);
 if(data.patch.summary){z.object({buffs:z.array(text),nerfs:z.array(text),systemChanges:z.array(text),otherChanges:z.array(text)}).parse(data.patch.summary);if(!data.patch.summaryReviewedAt)throw new Error('摘要缺少审核时间');date.parse(data.patch.summaryReviewedAt);}
 return true;
}
