import { parse } from 'acorn';
import { page,style } from './common.ts';
import type { Collector } from './types.ts';
// Parse literal public Svelte hydration data, never eval third-party JavaScript.
function literal(n:any):unknown {
 if(n.type==='Literal')return n.value;
 if(n.type==='ArrayExpression')return n.elements.map(literal);
 if(n.type==='ObjectExpression')return Object.fromEntries(n.properties.filter((p:any)=>p.type==='Property'&&!p.computed).map((p:any)=>[p.key.name??p.key.value,literal(p.value)]));
 return undefined;
}
export function academyGuides(scripts:string[]) {
 let guides:any[]=[];
 for(const script of scripts.filter(s=>s.includes('guides:'))){const file=parse(script,{ecmaVersion:'latest',sourceType:'module'}); const visit=(n:any)=>{if(!n||typeof n!=='object')return;if(n.type==='Property'&&n.key?.name==='guides'&&n.value?.type==='ArrayExpression')guides=literal(n.value) as any[];for(const v of Object.values(n))if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v);};visit(file);}
 return guides;
}
const url='https://tftacademy.com/tierlist/comps';
export default {id:'tftacademy',url,method:'公开 HTML 内 Svelte 字面量（AST，无代码执行）',async collect(set,now){
 const {$,hash}=await page(url,'tftacademy'); const patch=$('title').text().match(/Patch\s+(\d+\.\d+[a-z]?)/i)?.[1];
 if(!patch)throw new Error('缺少页面 Patch');
 const guides=academyGuides($('script:not([src])').map((_,e)=>$(e).text()).get()).filter(g=>g.isPublic===true&&String(g.set)===set);
 if(!guides.length)throw new Error('公开 guides 结构变化或当前 Set 无记录');
 return {patch,fields:['名称','Tier','运营分类','最终棋子','主C','来源更新时间'],message:'专家评级，不是对局胜率；保留公开最终棋盘，内部召唤物在归一化时隔离。',records:guides.map(g=>({source:'tftacademy' as const,sourceRecordId:g.id,name:g.metaTitle||g.title,set,patch,sourceUrl:`${url}/${g.compSlug}`,collectedAt:now,sourceUpdatedAt:new Date(g.updated).toISOString(),sha256:hash,tier:g.tier||undefined,archetype:style(g.style),coreUnits:g.finalComp.map((c:any)=>c.apiName),carries:g.mainChampion?.apiName?[g.mainChampion.apiName]:[],notes:['专家评级；条件与完整指南请查看原文。']}))};
}} satisfies Collector;
