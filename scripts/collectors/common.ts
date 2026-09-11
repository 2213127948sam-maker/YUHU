import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { mkdir,writeFile } from 'node:fs/promises';
import type { MetaSource, CompSourceData } from '../../src/types/terminal.ts';
import type { Collector } from './types.ts';
import { readJson,exists,DATA_DIR } from '../lib/storage.ts';
import path from 'node:path';
export async function page(url:string,id:string) {
 const r=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'TFT-Data-Terminal/0.1 (public pages, every 3 hours)'}});
 if(!r.ok) throw new Error(`HTTP ${r.status}`);
 const html=await r.text(); if(html.length<200) throw new Error('页面内容为空');
 const hash=createHash('sha256').update(html).digest('hex');
 await mkdir(path.join(DATA_DIR,'evidence'),{recursive:true});
 // Only factual extracted records are distributed; HTML snapshots stay in ignored cache.
 await mkdir('.cache/source-probes',{recursive:true}); await writeFile(`.cache/source-probes/${id}.html`,html);
 return {html,$:load(html),hash};
}
export const clean=(s:string)=>s.replace(/\s+/g,' ').trim();
export const style=(s:string)=>/reroll12|1\s*&\s*2.cost/i.test(s)?'unknown':/fast\s*9/i.test(s)?'fast9':/fast\s*8/i.test(s)?'fast8':/1.cost|reroll1\b/i.test(s)?'reroll1':/2.cost|reroll2\b/i.test(s)?'reroll2':/3.cost|reroll3\b/i.test(s)?'reroll3':/tempo/i.test(s)?'tempo':'unknown';
export function manual(id:MetaSource,url:string):Collector { return {id,url,method:'manual + HTML availability check',async collect(set,now){
 let detected:string|undefined;let availabilityError:unknown;
 try {const { $ }=await page(url,id);detected=clean($('title').text()+' '+$('body').clone().find('script,style').remove().end().text()).match(/(?:Patch|Ver:?)\s*(\d+\.\d+[a-z]?)/i)?.[1];}catch(e){availabilityError=e;}
 const file=path.join(DATA_DIR,'manual',`${id}.json`);
 if(!await exists(file)){if(availabilityError)throw availabilityError;return {patch:detected,records:[],fields:[],message:'公开 HTML 为动态页面外壳，未发现可审核的稳定公开数据接口；等待人工导入。'};}
 const records=await readJson<CompSourceData[]>(file);
 if(!Array.isArray(records)||records.some(r=>r.source!==id||!r.collectedAt||!r.patch||!r.sourceUrl||!r.set)) throw new Error('人工文件缺少来源/版本/时间');
 if(!records.length&&availabilityError)throw availabilityError;
 return {patch:detected??records[0]?.patch,records,fields:records.length?['人工审核的阵容数据']:[],message:(records.length?'人工快照；更新检测不会重写原采集时间。':'人工 Provider 已就绪，尚无审核记录。')+(availabilityError?' 网站可用性检查失败，当前显示人工审核快照。':'')};
 }}; }
