import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function harness() {
 const listeners: Record<string, (e:any)=>void> = {};
 const hits = new Map([['https://example.com/tft/index.html', new Response('last-good')], ['https://example.com/tft/assets/app.js', new Response('app')]]);
 let offline=false, serverError=false, activated=false, installFails=false, claimed=false;
 const deleted:string[]=[];
 const cache={addAll:async()=>{if(installFails) throw new Error('missing asset');},match:async(r:any)=>hits.get(typeof r==='string'?r:r.url)?.clone()};
 const script=(await readFile('scripts/pwa/service-worker.template.js','utf8')).replace('__PRECACHE__','["index.html","assets/app.js"]');
 vm.runInNewContext(script, { self:{registration:{scope:'https://example.com/tft/'},skipWaiting:async()=>{activated=true;},clients:{claim:async()=>{claimed=true;}},addEventListener:(type:string,fn:any)=>listeners[type]=fn},caches:{open:async()=>cache,keys:async()=>['tft-data-old','unrelated'],delete:async(key:string)=>{deleted.push(key);return true;}},fetch:async()=>{if(offline)throw new Error('offline');return new Response(serverError?'error':'new',{status:serverError?500:200});},Response,URL,AbortSignal });
 return {hits,deleted,offline:()=>{offline=true;},serverError:()=>{offline=false;serverError=true;},failInstall:()=>{installFails=true;},isActivated:()=>activated,isClaimed:()=>claimed,
 request:(mode:string,url='https://example.com/tft/')=>new Promise<Response>(resolve=>listeners.fetch({request:{url,method:'GET',mode},respondWith:resolve})),
 event:(type:string,data?:unknown)=>new Promise<void>((resolve,reject)=>{let waited=false;listeners[type]({data,waitUntil:(p:Promise<void>)=>{waited=true;p.then(resolve,reject);}});if(!waited)resolve();})};
}
test('PWA keeps HTML and data assets on the same build online, offline and on server errors',async()=>{
 const h=await harness();
 assert.equal(await (await h.request('navigate')).text(),'last-good');
 h.offline(); assert.equal(await (await h.request('navigate')).text(),'last-good');
 assert.equal(await (await h.request('cors','https://example.com/tft/assets/app.js')).text(),'app');
 h.serverError(); assert.equal(await (await h.request('navigate')).text(),'last-good');
 h.hits.clear(); assert.equal((await h.request('navigate')).type,'error');
});
test('PWA failed installation preserves old cache; activation is explicit and scoped',async()=>{
 const h=await harness();h.failInstall();
 await assert.rejects(h.event('install'),/missing asset/);
 assert.deepEqual(h.deleted,[]);assert.equal(h.isActivated(),false);
 await h.event('message',{type:'unrelated'});assert.equal(h.isActivated(),false);
 await h.event('message',{type:'ACTIVATE_UPDATE'});assert.equal(h.isActivated(),true);
 await h.event('activate');assert.deepEqual(h.deleted,['tft-data-old']);assert.equal(h.isClaimed(),true);
});
