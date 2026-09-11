import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import raw from '../src/data/generated/unified-data.json';
import rawBundle from '../src/data/generated/bundle.json';
import type { UnifiedTFTData,CompSourceData } from '../src/types/terminal.ts';
import type { StaticBundle } from '../src/data/types.ts';
import type { Collector } from '../scripts/collectors/types.ts';
import { validateTerminal,validateRecords } from '../src/data/terminalValidation.ts';
import { sourceFreshness } from '../src/utils/sourceFreshness.ts';
import { normalizeComps,normalizeName } from '../scripts/normalize/normalizeComps.ts';
import { collectSource } from '../scripts/lib/collect-source.ts';
import { academyGuides } from '../scripts/collectors/tftacademy.ts';
import { style } from '../scripts/collectors/common.ts';
import { atomicJson,commitBundle,readBundle,recover,withUpdateLock } from '../scripts/lib/storage.ts';
const data=raw as UnifiedTFTData,bundle=rawBundle.data[0] as StaticBundle;
const record=data.comps.flatMap(c=>c.sources).find(s=>s.source==='tftacademy')!;
const now=data.metadata.generatedAt;
const provider=(id:Collector['id'],collect:Collector['collect']):Collector=>({id,url:`https://${id}.com`,method:'test',collect});

test('current terminal snapshot has seven sources, valid references, provenance and current live Set',()=>{
 assert.equal(validateTerminal(data),true);
 assert.ok(data.champions.every(c=>c.id.startsWith('DA_')&&c.cost>=1&&c.cost<=5));
 assert.ok(data.champions.some(c=>c.id==='DA_18_ElderDragon'));
 assert.ok(!data.items.some(i=>/wisp|debug/i.test(i.id)));
 assert.ok(data.items.every(i=>Object.values(i.effects??{}).every(Number.isFinite)));
 assert.ok(data.comps.some(c=>new Set(c.sources.map(s=>s.source)).size>=2));
});
test('freshness distinguishes hotfix letters, missing version, old timestamps and clock errors',()=>{
 assert.equal(style('meta-mini-card--reroll12'),'unknown');
 assert.equal(style('comp-card--reroll2'),'reroll2');
 const t=Date.parse(now);assert.equal(sourceFreshness('18.2','18.2',now,t),'fresh');
 assert.equal(sourceFreshness('18.1b','18.2',now,t),'stale');
 assert.equal(sourceFreshness('18.2b','18.2',now,t),'stale');
 assert.equal(sourceFreshness(undefined,'18.2',now,t),'unknown');
 assert.equal(sourceFreshness('18.2','18.2',now,t+25*3600000),'stale');
 assert.equal(sourceFreshness('18.2','18.2',now,t-600000),'unknown');
 assert.equal(sourceFreshness('18.2','18.2',now,t,new Date(t-25*3600000).toISOString()),'stale');
});
test('same route preserves independent ratings, statistics and old patches; ambiguous identities remain separate',()=>{
 const a={...record,name:'Test Carry',coreUnits:[],carries:[]};
 const b:CompSourceData={...a,source:'tftflow',sourceRecordId:'test-flow',sourceUrl:'https://tftflow.com/',name:'test-carry',tier:'B',avgPlacement:4.01};
 const old={...a,patch:'18.1b',collectedAt:'2026-08-30T00:00:00Z'};
 const list=normalizeComps([a,b,old],bundle);assert.equal(list.length,1);assert.equal(list[0].sources.length,3);assert.equal(list[0].sources[1].tier,'B');assert.equal(list[0].sources[1].avgPlacement,4.01);assert.equal(list[0].sources[2].patch,'18.1b');assert.equal('tier' in list[0],false);
 assert.equal(normalizeName('  Kayle-Reroll!  '),'kayle reroll');
 assert.equal(normalizeComps([a,{...b,name:'Solar Test Carry'}],bundle).length,2);
 assert.equal(normalizeComps([{...a,carries:[bundle.champions.data[0].id]},{...b,carries:[bundle.champions.data[1].id]}],bundle).length,2);
});
test('source failure preserves original collection time and other sources still run',async()=>{
 const bad=provider('tftacademy',async()=>{throw new Error('offline');});
 const goodRecord:CompSourceData={...record,source:'tftflow',sourceUrl:'https://tftflow.com/',sourceRecordId:'flow'};
 const good=provider('tftflow',async()=>({patch:record.patch,records:[goodRecord],fields:['tier'],message:'ok'}));
 const a=await collectSource(bad,record.set,record.patch,now,[record]);const b=await collectSource(good,record.set,record.patch,now,[]);
 assert.equal(a.status.status,'error');assert.equal(a.records[0].collectedAt,record.collectedAt);assert.equal(a.records[0].retentionReason,'error');assert.equal(b.records.length,1);assert.notEqual(b.status.status,'error');
});
test('removed records are retained but not silently refreshed or reported as newly collected',async()=>{
 const result=await collectSource(provider('tftacademy',async()=>({patch:record.patch,records:[],fields:[],message:'empty'})),record.set,record.patch,now,[record]);
 assert.equal(result.status.status,'unknown');assert.equal(result.records[0].retained,true);assert.equal(result.records[0].retentionReason,'missing');assert.equal(result.records[0].collectedAt,record.collectedAt);
});
test('invalid provider data is isolated before publication',async()=>{
 for(const change of [{avgPlacement:9},{playRate:NaN},{sampleSize:-1},{sourceUrl:'https://evil.example/'},{collectedAt:'yesterday'},{set:'99'}])assert.throws(()=>validateRecords([{...record,...change}]));
 const result=await collectSource(provider('tftacademy',async()=>({records:[{...record,avgPlacement:99}],patch:record.patch,fields:[],message:''})),record.set,record.patch,now,[record]);assert.equal(result.status.status,'error');assert.equal(result.records[0].avgPlacement,record.avgPlacement);
 const dirty=structuredClone(data);dirty.comps[0].coreUnits=['missing'];assert.throws(()=>validateTerminal(dirty));
 const wrong=structuredClone(data);wrong.sourceStatus[0].detectedPatch='18.1';assert.throws(()=>validateTerminal(wrong));
});
test('public hydration parser reads literals without running embedded JavaScript',()=>{
 const result=academyGuides(['throw new Error("must not execute"); const data={guides:[{id:"one",tier:"S",items:["a"]}]}']);assert.deepEqual(result,[{id:'one',tier:'S',items:['a']}]);
 const calls=academyGuides(['const data={guides:[{id:dangerousFunction()}]}']);assert.equal(calls[0].id,undefined);
});
test('whole-generation publish rolls back unified entry and category files on failure',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'tft-terminal-'));
 await commitBundle(bundle,dir,undefined,{'unified-data':data,comps:data.comps,'source-status':data.sourceStatus});
 const before=await readFile(path.join(dir,'generated/unified-data.json'),'utf8');
 await assert.rejects(commitBundle(bundle,dir,async()=>{throw new Error('interruption');},{'unified-data':{broken:true}}));
 assert.equal(await readFile(path.join(dir,'generated/unified-data.json'),'utf8'),before);assert.deepEqual(await readBundle(dir),bundle);
 await assert.rejects(withUpdateLock(()=>withUpdateLock(async()=>{},dir),dir));
 const previous='history/recovery';await rename(path.join(dir,'generated'),path.join(dir,previous));await atomicJson(path.join(dir,'.transaction.json'),{previous});await recover(dir);assert.equal(await readFile(path.join(dir,'generated/unified-data.json'),'utf8'),before);
});
