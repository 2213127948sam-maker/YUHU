import path from 'node:path';
import { getCurrentPatch } from './collectors/riot.ts';
import { getStaticData } from './collectors/communityDragon.ts';
import academy from './collectors/tftacademy.ts';
import table from './collectors/tftable.ts';
import flow from './collectors/tftflow.ts';
import datatft from './collectors/datatft.ts';
import metatft from './collectors/metatft.ts';
import { DATA_DIR,exists,readJson,atomicJson,withUpdateLock,commitBundle,writeAttempt } from './lib/storage.ts';
import { staticSchema } from '../src/data/schema.ts';
import { normalizeComps } from './normalize/normalizeComps.ts';
import { normalizeItems } from './normalize/normalizeItems.ts';
import { normalizeAugments } from './normalize/normalizeAugments.ts';
import { provenance,sourceNames,type CompSourceData,type SourceStatus,type UnifiedTFTData } from '../src/types/terminal.ts';
import { sourceFreshness } from '../src/utils/sourceFreshness.ts';
import { validateTerminal,validateRecords } from '../src/data/terminalValidation.ts';
import { fetchDocument,parseJson } from '../src/dataProviders/http.ts';
import type { Collector } from './collectors/types.ts';
import { collectSource } from './lib/collect-source.ts';

export async function updateTerminal(){await withUpdateLock(async()=>{
 const previousFile=path.join(DATA_DIR,'generated/unified-data.json');const previous=await exists(previousFile)?await readJson<UnifiedTFTData>(previousFile):null;
 const now=new Date().toISOString();console.log('TFT DATA UPDATE');
 let observed;
 try {
 const patch=await getCurrentPatch(p=>{observed=p;});const info=patch.data[0];
 const bundle={...await getStaticData(info),patch};staticSchema.parse(bundle);
 const release=parseJson<{version:string}>(await fetchDocument(info.resourceMetadataUrl,'CommunityDragon'),'CommunityDragon');
 if(!release.version.startsWith(info.resourceVersion.split('.').slice(0,2).join('.')+'.'))throw new Error('更新期间资源版本发生变化');
 const sourceStatus:SourceStatus[]=[{id:'riot',name:'Riot',sourceUrl:patch.metadata.sourceUrl,detectedPatch:info.patch,collectedAt:patch.metadata.collectedAt,checkedAt:now,status:'fresh',method:'官方公告 HTML + JSON-LD',fields:['Set','Patch','发布时间','公告 URL'],message:'以官方公告为基准；非地区服务器上线探测。'},{id:'communityDragon',name:'CommunityDragon',sourceUrl:bundle.champions.metadata.sourceUrl,detectedPatch:info.patch,collectedAt:bundle.champions.metadata.collectedAt,checkedAt:now,status:'fresh',method:'公开 JSON + Riot 目录交叉校验',fields:['英雄','羁绊','装备名称与图标','强化及描述'],message:'正式 TFTSet18；排除旧引擎、内部对象和仙灵；保留可玩 Riftbeast。当前装备描述与原始属性为空，页面明确留空。'}];
 const records:CompSourceData[]=[];
 for(const provider of [academy,table,flow,datatft,metatft] as Collector[]){
  const result=await collectSource(provider,info.set,info.patch,new Date().toISOString(),previous?.comps.flatMap(c=>c.sources)??[]);
  records.push(...result.records);sourceStatus.push(result.status);
  await atomicJson(path.join(DATA_DIR,'evidence',`${provider.id}.json`),result);
 }
 const summaryFile=path.join(DATA_DIR,'manual/patch-summary.json');const summary=await exists(summaryFile)?await readJson<any>(summaryFile):null;
 const summaryMatches=summary?.patch===info.patch&&summary?.sourceUrl===patch.metadata.sourceUrl&&summary?.reviewedAt;
 const data:UnifiedTFTData={metadata:{set:info.set,patch:info.patch,generatedAt:new Date().toISOString(),schemaVersion:1},patch:{...provenance(patch.metadata),officialUrl:patch.metadata.sourceUrl,releasedAt:info.releasedAt,checkedAt:info.checkedAt,summary:summaryMatches?summary.summary:undefined,summaryReviewedAt:summaryMatches?summary.reviewedAt:undefined,summaryStatus:summaryMatches?'官方公告人工摘要（重点摘选）':'当前版本摘要待人工审核，请查看官方公告'},sourceStatus,comps:normalizeComps(records,bundle),items:normalizeItems(bundle),augments:normalizeAugments(bundle),champions:bundle.champions.data.map(e=>({...e,provenance:provenance(bundle.champions.metadata)})),traits:bundle.traits.data.map(e=>({...e,provenance:provenance(bundle.traits.metadata)}))};
 validateTerminal(data);
 await commitBundle(bundle,DATA_DIR,undefined,{'unified-data':data,comps:data.comps,'source-status':sourceStatus});
 await writeAttempt({checkedAt:now,success:true,observedPatch:info});
 console.log(`Current: Set ${info.set} / Patch ${info.patch}`);for(const s of sourceStatus)console.log(`${s.name.padEnd(17)} ${s.status.toUpperCase()} ${s.detectedPatch??'未识别'}${s.retained?' (LKG)':''}`);
 console.log(`Comps: ${data.comps.length}\nChampions: ${data.champions.length}\nTraits: ${data.traits.length}\nAugments: ${data.augments.length}\nItems: ${data.items.length}\nGenerated: ${data.metadata.generatedAt}`);
 }catch(e){await writeAttempt({checkedAt:now,success:false,error:String(e),observedPatch:observed});throw e;}
 });}
if(process.argv[1]?.endsWith('update-data.ts'))updateTerminal().catch(e=>{console.error('DATA UPDATE FAILED; Last Known Good preserved',e);process.exitCode=1;});
