# TFT DATA · 最新版本数据终端

当前主流程已调整为版本与多来源数据浏览。首页、阵容、海克斯、装备、数据源五个导航；不提供金币/血量输入、局内推荐、D牌决策、AI或个性化。旧源码保留在原目录，未被前端入口加载。

## 运行

需要 Node.js 22.12+，本机使用 Node 24。标准 npm：

```sh
npm ci
npm run data:update
npm run data:validate
npm test
npm run build
npm run preview -- --port 5173
```

本机没有系统 npm，可用 `node scripts/npm.mjs` 或 `.\npm.cmd` 替代 npm。开发使用 `npm run dev`；PWA 仅生产构建启用，所以手机缓存验收使用 build + preview 或 HTTPS 部署。

## 统一入口与来源

前端只导入 `src/data/generated/unified-data.json`，不会从第三方网站请求业务数据。图标仍来自来源 CDN，失败显示文字。

- Riot：官方公告 HTML 与 JSON-LD，验证版本、发布时间及资源分支。
- CommunityDragon：公开 JSON，正式 TFTSet18 过滤，并用 Riot 英雄/物品目录交叉核对。
- TFT Academy：公开 HTML 中的 Svelte 字面量，用 Acorn AST 解析，绝不执行第三方 JavaScript。保留评级、名称、最终棋盘、主C和更新时间。
- TFTable：公开 HTML 的 __NEXT_DATA__，保留均排、登场率、版本变化值；缺少样本数、分段、地区与前四率时不填。
- TFTFlow：公开 HTML 卡片，保留部分 Tier 和 Default / Meta / Other 分组；分组不会转换成 Tier。
- DataTFT / MetaTFT：动态 HTML 外壳暂无稳定公开数据，使用 manual Provider；尚无审核记录时为 unknown。

每条记录包含来源 URL、Set、Patch、采集时间；自动采集记录带原页 SHA-256。`src/data/evidence` 保存提取事实，原始 HTML 只存忽略的 `.cache/source-probes`。不使用旧 TOP4.GG 数据填充这五家的结果。

## 数据边界

初始版本 Set18 / 18.2：74条英雄（65个基础身份+9个额外形态）、36羁绊、155装备、250海克斯。阵容数量随采集结果变化，查看 [交付报告](docs/terminal-report.md)。

当前上游装备描述和属性为空；不使用旧引擎同名数据补齐。海克斯描述包含未展开数值，页面用“数值缺失”标记，原始模板保留在 JSON 中。主坦没有明确来源时留空。趋势只展示来源原值，不做综合评级或主观涨跌。

别名匹配在 `scripts/normalize/normalizeComps.ts`。标准化大小写/标点/空格，结合人工别名和核心身份冲突检查；有歧义时保留两条，不仅因同一主C就合并。

## 更新、时效与回退

`npm run data:update`：Riot → 静态数据 → 逐一运行五家 Provider → 规范化 → 版本/引用/数值校验 → staging → 整批目录发布。

每家 Provider 单独捕获失败，其他来源继续。旧记录保留原版本、原时间，并标记失败保留、本次未收录或历史版本。补丁不一致（含 b/c 等后缀）为 stale；同版采集/来源生成超过24小时也为 stale；缺版本或记录为 unknown；请求/结构失败为 error。

整批更新失败不覆盖 generated，历史有效快照位于 `src/data/history`。发布有互斥锁和恢复日志。Windows 下若预览/编辑器占用目录导致交换失败，关闭占用后重试，禁止手工拼接分类文件。`data:patch` 只检测官方新版本；不会把旧数据重标为新版本。

`data:validate` 校验统一入口、分类文件、引用、独立来源和最近已观察官方版本。stale/unknown/error 来源本身不令网站空白，也不必导致全局校验失败。

## 人工维护

- `src/data/manual/datatft.json` / `metatft.json`：数组，每条符合 `CompSourceData`（`src/types/terminal.ts`）。必须提供真实的 source、sourceRecordId、sourceUrl、set、patch、name、collectedAt 和 notes；只录入可验证字段。率统一为0–1，均排1–8，样本为非负整数。
- 源 URL 必须属于对应站点。导入后执行 data:update 和 data:validate。网络检查不改变人工采集时间。
- `src/data/manual/patch-summary.json`：官方公告的中文重点摘要，保留 sourceUrl、patch、reviewedAt；版本变化后旧摘要自动停止展示，等待重新审核。
- 新 Set 需要先审核 CommunityDragon 过滤规则，不自动套用 Set18 规则。

## 每3小时更新与静态部署

`.github/workflows/update-and-deploy.yml` 已配置每3小时（UTC每3小时的第17分）更新 → 校验 → 测试 → 构建 → 提交有效快照 → GitHub Pages 部署，支持手动触发。失败则不发布新网站。定时运行由 GitHub 调度，可能延迟。

目前仓库没有 remote，配置尚未在 GitHub 启用，电脑上也没有新建后台任务。后续将项目放到目标 GitHub 仓库默认分支，在 Settings → Pages 选择 GitHub Actions，并允许工作流写入数据快照。无需数据库。构建使用相对路径与 hash 路由，支持仓库子目录。

参考：[GitHub Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)、[GitHub 定时事件](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。

## PWA 与手机

manifest、192/512图标、standalone、移动 viewport 已实现。构建自动生成带内容哈希的 service worker，预缓存本次完整 HTML/JS/CSS/图标，安装失败保留旧缓存；整页导航固定使用同一套已安装首页和数据文件，避免新旧版本混用。新版本完整下载后提示「更新并重新加载」，点击后切换；网络恢复、回到页面和每小时会检查更新。页面显示缓存就绪/失败状态。

HTTPS 部署后可在手机浏览器“添加到主屏幕”。普通局域网 HTTP 通常不支持 service worker；localhost 是本机测试例外。目前缓存逻辑自动测试通过、内置浏览器报告缓存就绪，但停止本地服务后的内置浏览器整页刷新未成功恢复，真实手机离线重开仍待验收，不承诺已完成。

## 测试与报告

`npm test` 为当前数据端10项测试，覆盖真实快照、时效、合并、失败隔离、原时间保留、AST安全解析、发布回滚/恢复/锁、PWA回退。旧局内功能测试以 `npm run test:legacy` 保留，不参与当前 CI。

`node scripts/npm.mjs exec tsx -- scripts/report-terminal.ts` 根据当前统一快照生成包含全部阵容的 [交付报告](docs/terminal-report.md)。

