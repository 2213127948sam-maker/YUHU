import { readFile,writeFile } from 'node:fs/promises';
import type { UnifiedTFTData } from '../src/types/terminal.ts';
import { archetypeNames,sourceNames } from '../src/types/terminal.ts';
const d=JSON.parse(await readFile('src/data/generated/unified-data.json','utf8')) as UnifiedTFTData;
const count=(id:string)=>d.comps.flatMap(c=>c.sources).filter(s=>s.source===id&&!s.retained).length;
const current=d.comps.filter(c=>c.sources.some(s=>s.patch===d.metadata.patch&&!s.retained));
const text=[`# TFT DATA 第一阶段交付报告`, `\n当前版本：Set ${d.metadata.set} / Patch ${d.metadata.patch}。统一快照：${d.metadata.generatedAt}。`,
 '\n## Collector 状态',
 '| 来源 | 状态 | 识别版本 | 当前阵容记录 | 方式 | 字段与限制 |','|---|---|---|---:|---|---|',
 ...d.sourceStatus.map(s=>`| [${s.name}](${s.sourceUrl}) | ${s.status} | ${s.detectedPatch??'未识别'} | ${count(s.id)} | ${s.method} | ${s.fields.join('、')||'暂无'}。${s.message} |`),
 '\n## 数据量',
 `\nChampions: ${d.champions.length}\n\nTraits: ${d.traits.length}\n\nItems: ${d.items.length}\n\nAugments: ${d.augments.length}\n\nComps: ${d.comps.length}（当前版本且本次仍收录 ${current.length}）`,
 `\n74条英雄包括65个基础身份与9个额外拉克丝形态，不是74个不同基础英雄。没有沿用旧 TOP4.GG 阵容作为五家指定来源的数据。`,
 `\n装备描述已提供 ${d.items.filter(e=>e.description).length}/${d.items.length}；原始属性已提供 ${d.items.filter(e=>Object.keys(e.effects??{}).length).length}/${d.items.length}。缺失是当前上游实际状态。海克斯描述已提供 ${d.augments.filter(e=>e.description).length}/${d.augments.length}，部分数值仍是原始占位参数，界面显示缺失提示。`,
 '\n## 全部归一化阵容',
 '\n按照公开来源收录顺序列出，不代表综合强度排行。保守去重：有歧义的变体保留两条。',
 '| # | 阵容 | 类型 | 来源结果 |','|---:|---|---|---|',
 ...d.comps.map((c,i)=>`| ${i+1} | ${c.name.replaceAll('|','/')} | ${archetypeNames[c.archetype]} | ${c.sources.map(s=>`${sourceNames[s.source]}：${s.tier??(s.category?`分组 ${s.category}`:s.avgPlacement!==undefined?`均排 ${s.avgPlacement.toFixed(2)}`:'未评级')}（${s.patch}${s.retained?'；保留快照':''}）`).join('；')} |`),
 '\n## 自动化与人工边界',
 '\n- 全自动：官方版本与发布关联检查、正式 Set 静态数据过滤、Academy / TFTable / TFTFlow 的公开页面采集、规范化、独立来源状态、校验及整批发布。',
 '- 半自动：页面结构改变后的 Collector 维护；阵容别名与身份匹配审核。',
 '- 人工：DataTFT / MetaTFT 快照、中文补丁摘要、新 Set 过滤策略。人工数据不会在每次检查时刷新其采集时间。',
 '- `.github/workflows/update-and-deploy.yml` 已配置每3小时运行更新、校验、测试、构建、保存快照及部署 GitHub Pages。目前无 GitHub remote，也未部署/启用该工作流；此电脑没有新增后台定时任务。',
 '\n## 验证',
 '\n- `npm run data:update` 已实跑，指定来源3家成功、2家 unknown；缺数据不会伪造 PASS。',
 '- `npm run data:validate` 与生产构建通过。10项自动测试覆盖来源数据、热修复版本、时效、保守合并、多源失败隔离、原时间保留、AST无执行、整批回滚/恢复/互斥锁及 PWA 同版本导航、失败保留与主动切换。',
 '- 浏览器已验证首页、中文英雄搜索、多源阵容详情、海克斯筛选与装备搜索；手机视口无横向溢出，首屏能看到 Meta。',
 '- PWA manifest、192/512图标、standalone、带版本缓存已实现；浏览器显示缓存已就绪。缓存逻辑自动测试通过，但内置浏览器在停止本地服务后整页刷新未恢复，不能声称手机离线验收已经通过。真实手机 HTTPS 安装与断网重开仍需验收。',
 '\n## 风险与限制',
 '\n- Academy 依赖公开 Svelte hydration 的字段；TFTable 依赖公开 `__NEXT_DATA__`；TFTFlow 依赖语义 class 与版本标记。页面结构改变会导致失败并保留上一份有效数据。没有私有接口破解、登录模拟或反爬绕过。',
 '- TFTable 此公开快照没有统计分段、地区、样本数与前四率。原站均排变化值直接展示；未推导综合趋势。',
 '- TFTFlow Default / Meta / Other 是分组，不是 S/A/B；复合费用类型不会误归为单一费用。',
 '- 主坦未明确提供的阵容留空；最终棋盘不等于主C主坦优先级，不提供局内操作建议。',
 '- 官方普通补丁号可验证，但同号热修复与国服/手游各地区上线时间没有独立探测。中文摘要为人工重点摘选，不是整份公告。',
 '- 静态图标仍来自海外 CDN；加载失败显示文字。公开部署与定时任务尚未启用。',
 '- GitHub Actions 定时执行可能延迟；需仓库默认分支与 Pages 设置启用，不能承诺精确到点刷新。',
 '\n## 使用', '\n本地预览：http://127.0.0.1:5173/ 。导航：首页、阵容、海克斯、装备、数据源。所有业务数据来自 `src/data/generated/unified-data.json`；旧局内决策源码已退出主流程。',
 ];
await writeFile('docs/terminal-report.md',text.join('\n')+'\n');console.log(`Report: ${d.comps.length} comps; ${current.length} current; ${d.metadata.patch}`);

