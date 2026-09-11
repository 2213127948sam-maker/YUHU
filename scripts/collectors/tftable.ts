import { page } from './common.ts';
import type { Collector } from './types.ts';
const url='https://tftable.cc/comps';
export default {id:'tftable',url,method:'公开 HTML 内 __NEXT_DATA__ JSON',async collect(set,now){
 const {$,hash}=await page(url,'tftable'); const data=JSON.parse($('#__NEXT_DATA__').text()).props.pageProps;
 const view=data.view; if(!view?.patch||!Array.isArray(view.compositionSummaries)||!view.compositionSummaries.length)throw new Error('公开 JSON 结构变化');
 return {patch:view.patch,sourceUpdatedAt:view.generatedAt,fields:['阵容标识','平均排名','登场率','均排版本变化值','来源更新时间'],message:'未取得筛选分段、样本量、前四率；均排变化保留原数值，不猜测趋势方向。',records:view.compositionSummaries.map((r:any)=>({source:'tftable' as const,sourceRecordId:r.slug,name:r.slug.replaceAll('_',' '),set:view.patch.split('.')[0],patch:view.patch,sourceUrl:url,collectedAt:now,sourceUpdatedAt:view.generatedAt,sha256:hash,avgPlacement:r.avgPlacementValue,playRate:data.compStats?.[r.slug]?.playRate,trendDelta:r.trendDelta,notes:['原站阵容标识：'+r.slug,'统计分段、地区和样本数未随此公开快照提供。','trendDelta 为原站 version 模式均排变化；不推导综合趋势。']}))};
}} satisfies Collector;
