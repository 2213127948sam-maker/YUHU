# TFT DATA 第一阶段交付报告

当前版本：Set 18 / Patch 18.2。统一快照：2026-09-11T01:18:39.713Z。

## Collector 状态
| 来源 | 状态 | 识别版本 | 当前阵容记录 | 方式 | 字段与限制 |
|---|---|---|---:|---|---|
| [Riot](https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-2/) | fresh | 18.2 | 0 | 官方公告 HTML + JSON-LD | Set、Patch、发布时间、公告 URL。以官方公告为基准；非地区服务器上线探测。 |
| [CommunityDragon](https://raw.communitydragon.org/latest/cdragon/tft/zh_cn.json) | fresh | 18.2 | 0 | 公开 JSON + Riot 目录交叉校验 | 英雄、羁绊、装备名称与图标、强化及描述。正式 TFTSet18；排除旧引擎、内部对象和仙灵；保留可玩 Riftbeast。当前装备描述与原始属性为空，页面明确留空。 |
| [TFT Academy](https://tftacademy.com/tierlist/comps) | fresh | 18.2 | 37 | 公开 HTML 内 Svelte 字面量（AST，无代码执行） | 名称、Tier、运营分类、最终棋子、主C、来源更新时间。专家评级，不是对局胜率；保留公开最终棋盘，内部召唤物在归一化时隔离。 |
| [TFTable](https://tftable.cc/comps) | fresh | 18.2 | 22 | 公开 HTML 内 __NEXT_DATA__ JSON | 阵容标识、平均排名、登场率、均排版本变化值、来源更新时间。未取得筛选分段、样本量、前四率；均排变化保留原数值，不猜测趋势方向。 |
| [TFTFlow](https://tftflow.com/) | fresh | 18.2 | 30 | 公开 HTML 语义卡片 | 阵容名称、原站分组、部分Tier、运营分类。只采集公开卡片；无胜率/样本统计，不推断隐藏评级。 |
| [DataTFT](https://www.datatft.com/comps/rank) | unknown | 未识别 | 0 | manual + HTML availability check | 暂无。人工 Provider 已就绪，尚无审核记录。 |
| [MetaTFT](https://www.metatft.com/comps) | unknown | 未识别 | 0 | manual + HTML availability check | 暂无。人工 Provider 已就绪，尚无审核记录。 |

## 数据量

Champions: 74

Traits: 36

Items: 155

Augments: 250

Comps: 75（当前版本且本次仍收录 75）

74条英雄包括65个基础身份与9个额外拉克丝形态，不是74个不同基础英雄。没有沿用旧 TOP4.GG 阵容作为五家指定来源的数据。

装备描述已提供 0/155；原始属性已提供 0/155。缺失是当前上游实际状态。海克斯描述已提供 250/250，部分数值仍是原始占位参数，界面显示缺失提示。

## 全部归一化阵容

按照公开来源收录顺序列出，不代表综合强度排行。保守去重：有歧义的变体保留两条。
| # | 阵容 | 类型 | 来源结果 |
|---:|---|---|---|
| 1 | Elder Dragon Fast 9 | Fast 9 | TFT Academy：S（18.2） |
| 2 | Draven Fast 9 | Fast 9 | TFT Academy：S（18.2）；TFTFlow：分组 default（18.2） |
| 3 | Invoker Ahri | Fast 8 | TFT Academy：A（18.2）；TFTFlow：分组 default（18.2） |
| 4 | Primal Nidalee Sivir | Fast 8 | TFT Academy：A（18.2） |
| 5 | Rapidfire Aphelios | Fast 8 | TFT Academy：A（18.2）；TFTable：均排 4.03（18.2） |
| 6 | Summoner Malphite Flex | Fast 8 | TFT Academy：A（18.2） |
| 7 | Juggernaut Caitlyn Reroll | 2费 Reroll | TFT Academy：B（18.2） |
| 8 | Master Yi Rengar Reroll | 3费 Reroll | TFT Academy：B（18.2） |
| 9 | Riftbeast Pebbles Reroll | 1费 Reroll | TFT Academy：B（18.2） |
| 10 | Invoker Morgana | 类型待确认 | TFT Academy：B（18.2） |
| 11 | Camille Akali Reroll | 1费 Reroll | TFT Academy：B（18.2） |
| 12 | Blossom Ashe | Fast 9 | TFT Academy：S（18.2） |
| 13 | Defender Cassiopeia Reroll | 3费 Reroll | TFT Academy：B（18.2） |
| 14 | Elderwood Ezreal Soraka | Fast 8 | TFT Academy：C（18.2） |
| 15 | Invoker Nidalee | Fast 8 | TFT Academy：C（18.2）；TFTFlow：C（18.2） |
| 16 | Solar Kayle Reroll | 2费 Reroll | TFT Academy：C（18.2） |
| 17 | Vanguard Rengar Reroll | 3费 Reroll | TFT Academy：C（18.2） |
| 18 | Blackthorn Warwick Reroll | 2费 Reroll | TFT Academy：C（18.2） |
| 19 | Elderwood Teemo Reroll | 2费 Reroll | TFT Academy：C（18.2） |
| 20 | Alistar Yunara Reroll | 2费 Reroll | TFT Academy：C（18.2） |
| 21 | Lunar Kha'Zix Reroll | 3费 Reroll | TFT Academy：B（18.2） |
| 22 | Flora Fatalis Sprykin Veigar Reroll | 1费 Reroll | TFT Academy：X（18.2） |
| 23 | Trait Ladder | Fast 9 | TFT Academy：X（18.2） |
| 24 | Fae Tristana Reroll | 3费 Reroll | TFT Academy：X（18.2） |
| 25 | Unrivaled Kha'Zix Reroll | 3费 Reroll | TFT Academy：X（18.2） |
| 26 | Sprykin Fae Rengar | 3费 Reroll | TFT Academy：X（18.2） |
| 27 | Blossom Ahri Ashe | Fast 8 | TFT Academy：A（18.2） |
| 28 | Vanguard Aphelios | Fast 8 | TFT Academy：A（18.2）；TFTable：均排 4.30（18.2）；TFTFlow：分组 meta（18.2） |
| 29 | Adaptor Kog'Maw | 3费 Reroll | TFT Academy：B（18.2） |
| 30 | Sprykin Teemo Reroll | 2费 Reroll | TFT Academy：C（18.2） |
| 31 | Riftbeast Elder Dragon | Fast 9 | TFT Academy：B（18.2） |
| 32 | Sivir Flex | Fast 8 | TFT Academy：A（18.2） |
| 33 | Spellweaver Vanguard Ahri | Fast 8 | TFT Academy：B（18.2） |
| 34 | Nidalee Aphelios | Fast 8 | TFT Academy：B（18.2）；TFTFlow：分组 default（18.2） |
| 35 | Zyra Ahri | Fast 8 | TFT Academy：B（18.2） |
| 36 | Aphelios Flex | Fast 8 | TFT Academy：B（18.2） |
| 37 | Elderwood Aphelios | Fast 8 | TFT Academy：B（18.2）；TFTable：均排 4.30（18.2）；TFTFlow：分组 meta（18.2） |
| 38 | elderwood 95 | 类型待确认 | TFTable：均排 3.65（18.2） |
| 39 | dragon 95 | 类型待确认 | TFTable：均排 3.69（18.2） |
| 40 | blossom 95 | 类型待确认 | TFTable：均排 4.06（18.2） |
| 41 | riftbeast reroll | 类型待确认 | TFTable：均排 4.29（18.2） |
| 42 | defender cassiopeia | 3费 Reroll | TFTable：均排 4.29（18.2）；TFTFlow：B（18.2） |
| 43 | caitlyn | 类型待确认 | TFTable：均排 4.33（18.2） |
| 44 | adaptor reroll | 类型待确认 | TFTable：均排 4.33（18.2） |
| 45 | blossom ahri | 类型待确认 | TFTable：均排 4.35（18.2） |
| 46 | zyra fatalis | 类型待确认 | TFTable：均排 4.38（18.2） |
| 47 | vanguard morgana | 类型待确认 | TFTable：均排 4.42（18.2） |
| 48 | hunter sivir | Fast 8 | TFTable：均排 4.43（18.2）；TFTFlow：分组 default（18.2） |
| 49 | veigar reroll | 1费 Reroll | TFTable：均排 4.48（18.2）；TFTFlow：分组 meta（18.2） |
| 50 | riftbeast | 类型待确认 | TFTable：均排 4.50（18.2） |
| 51 | elderwood | 类型待确认 | TFTable：均排 4.53（18.2） |
| 52 | unrivaled | 类型待确认 | TFTable：均排 4.54（18.2） |
| 53 | Solar Akali | 类型待确认 | TFTable：均排 4.56（18.2） |
| 54 | spellweaver ahri | Fast 8 | TFTable：均排 4.59（18.2）；TFTFlow：B（18.2） |
| 55 | tristana reroll | 3费 Reroll | TFTable：均排 4.70（18.2）；TFTFlow：分组 meta（18.2） |
| 56 | solar kayle | 类型待确认 | TFTable：均排 4.72（18.2） |
| 57 | Sivir Nidalee | Fast 8 | TFTFlow：分组 default（18.2） |
| 58 | Soraka Flex | Fast 8 | TFTFlow：分组 default（18.2） |
| 59 | Rengar Reroll | 3费 Reroll | TFTFlow：分组 meta（18.2） |
| 60 | Riftbeast Tempo | 3费 Reroll | TFTFlow：分组 meta（18.2） |
| 61 | Caitlyn Reroll | 2费 Reroll | TFTFlow：分组 meta（18.2） |
| 62 | Master Yi Reroll | 3费 Reroll | TFTFlow：分组 meta（18.2） |
| 63 | Blossom | Fast 8 | TFTFlow：分组 meta（18.2） |
| 64 | Rapidfire Bramble | Fast 8 | TFTFlow：A（18.2） |
| 65 | Unrivaled Kha'Zix & Rengar | 3费 Reroll | TFTFlow：B（18.2） |
| 66 | Yunara Executioner Reroll | 2费 Reroll | TFTFlow：C（18.2） |
| 67 | Akali Reroll | 1费 Reroll | TFTFlow：C（18.2） |
| 68 | Warwick Reroll | 2费 Reroll | TFTFlow：D（18.2） |
| 69 | Dark Ritual Coven | Fast 8 | TFTFlow：S（18.2） |
| 70 | Blossom Fast 9 | Fast 9 | TFTFlow：A（18.2） |
| 71 | Invoker Brambleback | Fast 8 | TFTFlow：B（18.2） |
| 72 | Pebbles Reroll | 1费 Reroll | TFTFlow：B（18.2） |
| 73 | Blackthorn Kha'Zix | 3费 Reroll | TFTFlow：C（18.2） |
| 74 | Elderwood Kayle Reroll | 类型待确认 | TFTFlow：C（18.2） |
| 75 | Inferno Kayle Reroll | 类型待确认 | TFTFlow：D（18.2） |

## 自动化与人工边界

- 全自动：官方版本与发布关联检查、正式 Set 静态数据过滤、Academy / TFTable / TFTFlow 的公开页面采集、规范化、独立来源状态、校验及整批发布。
- 半自动：页面结构改变后的 Collector 维护；阵容别名与身份匹配审核。
- 人工：DataTFT / MetaTFT 快照、中文补丁摘要、新 Set 过滤策略。人工数据不会在每次检查时刷新其采集时间。
- `.github/workflows/update-and-deploy.yml` 已配置每3小时运行更新、校验、测试、构建、保存快照及部署 GitHub Pages。目前无 GitHub remote，也未部署/启用该工作流；此电脑没有新增后台定时任务。

## 验证

- `npm run data:update` 已实跑，指定来源3家成功、2家 unknown；缺数据不会伪造 PASS。
- `npm run data:validate` 与生产构建通过。10项自动测试覆盖来源数据、热修复版本、时效、保守合并、多源失败隔离、原时间保留、AST无执行、整批回滚/恢复/互斥锁及 PWA 同版本导航、失败保留与主动切换。
- 浏览器已验证首页、中文英雄搜索、多源阵容详情、海克斯筛选与装备搜索；手机视口无横向溢出，首屏能看到 Meta。
- PWA manifest、192/512图标、standalone、带版本缓存已实现；浏览器显示缓存已就绪。缓存逻辑自动测试通过，但内置浏览器在停止本地服务后整页刷新未恢复，不能声称手机离线验收已经通过。真实手机 HTTPS 安装与断网重开仍需验收。

## 风险与限制

- Academy 依赖公开 Svelte hydration 的字段；TFTable 依赖公开 `__NEXT_DATA__`；TFTFlow 依赖语义 class 与版本标记。页面结构改变会导致失败并保留上一份有效数据。没有私有接口破解、登录模拟或反爬绕过。
- TFTable 此公开快照没有统计分段、地区、样本数与前四率。原站均排变化值直接展示；未推导综合趋势。
- TFTFlow Default / Meta / Other 是分组，不是 S/A/B；复合费用类型不会误归为单一费用。
- 主坦未明确提供的阵容留空；最终棋盘不等于主C主坦优先级，不提供局内操作建议。
- 官方普通补丁号可验证，但同号热修复与国服/手游各地区上线时间没有独立探测。中文摘要为人工重点摘选，不是整份公告。
- 静态图标仍来自海外 CDN；加载失败显示文字。公开部署与定时任务尚未启用。
- GitHub Actions 定时执行可能延迟；需仓库默认分支与 Pages 设置启用，不能承诺精确到点刷新。

## 使用

本地预览：http://127.0.0.1:5173/ 。导航：首页、阵容、海克斯、装备、数据源。所有业务数据来自 `src/data/generated/unified-data.json`；旧局内决策源码已退出主流程。
