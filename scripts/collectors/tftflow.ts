import { page,clean,style } from './common.ts';
import type { Collector } from './types.ts';
import type { CompSourceData } from '../../src/types/terminal.ts';
const url='https://tftflow.com/';
export default {id:'tftflow',url,method:'公开 HTML 语义卡片',async collect(set,now){
 const {$,hash}=await page(url,'tftflow'); const body=$('body').clone();body.find('script,style,.comments-area').remove();const patch=clean(body.text()).match(/Patch\s+(\d+\.\d+[a-z]?)/i)?.[1];
 if(!patch)throw new Error('缺少页面 Patch');
 const records:CompSourceData[]=[];
 $('.meta-tier-comp-link, a.meta-mini-card').each((_,el)=>{const a=$(el), mini=a.hasClass('meta-mini-card'),card=mini?a:a.closest('.comp-card-wrapper');const link=a.attr('href');if(!link?.includes(`/set${set}/`))return;
 const name=clean(mini?a.find('.meta-mini-card-name').text():a.text());
 const category=a.closest('.meta-section').attr('class')?.match(/meta-section--(default|meta|other)/)?.[1];
 const types=(card.attr('class')||'')+' '+(card.find('.comp-card').attr('class')||'');
 const tier=card.find('.tier-dropdown-label').attr('data-value');
 const mixedCost=/reroll12/.test(types);
 records.push({source:'tftflow',sourceRecordId:link.split('/').filter(Boolean).pop()!,sourceUrl:link,name,set,patch,collectedAt:now,sha256:hash,category,tier,archetype:style(types),notes:['来源分组保留为 Default / Meta / Other，不换算成 S/A。','部分阵容依赖特定强化或装备，完整条件见原文。',...(mixedCost?['原站标为1费与2费混合 Reroll，不归为单一费用。']:[])]}); });
 if(!records.length)throw new Error('阵容卡片结构变化');return {patch,records,fields:['阵容名称','原站分组','部分Tier','运营分类'],message:'只采集公开卡片；无胜率/样本统计，不推断隐藏评级。'};
}} satisfies Collector;
