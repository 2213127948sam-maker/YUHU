import { loadData } from '../data';
import type { DataStatus } from '../data/types';
const labels: Record<DataStatus, string> = { fresh: 'Fresh · 已同步', stale: 'Stale · 待更新', error: 'Error · 请检查' };
export function DataStatusPage() {
  let data;
  try { data = loadData(); } catch (error) {
    return <main><h1>TFT 数据状态</h1><p role="alert">Error：本地数据结构无效。</p><pre>{String(error)}</pre><p>请运行 npm run data:update 检查具体错误。</p></main>;
  }
  const { bundle, comps, status } = data;
  return <main>
    <header><p><a href="/">← 返回局内助手</a> · TFT 助手 V0.1 / 开发视图</p><h1>数据状态</h1><p>查看真实数据、来源与新鲜度；运营适配分由独立规则计算。</p></header>
    <dl className="overview">
      <div><dt>Current Set</dt><dd>{status.current.set}</dd></div>
      <div><dt>Current Patch</dt><dd>{status.current.patch}</dd></div>
      <div><dt>资源版本</dt><dd>{bundle.patch.data[0].resourceVersion}</dd></div>
      <div><dt>Last update</dt><dd>{bundle.champions.metadata.collectedAt}</dd></div>
    </dl>
    <p>Static Data: <strong className={status.staticStatus}>{labels[status.staticStatus]}</strong>　Meta Data: <strong className={status.metaStatus}>{labels[status.metaStatus]}</strong></p>
    {status.staticVersionMismatch && <p role="alert">检测到新版本。下方静态缓存仍为 {bundle.patch.data[0].patch}，不冒充新版本数据。</p>}
    {status.lastError && <pre role="alert">{status.lastError}（保留上一份有效缓存）</pre>}
    <div className="table-wrap"><table><caption>本地数据与来源</caption><thead><tr><th>数据</th><th>数量</th><th>版本</th><th>来源 / 更新时间</th></tr></thead><tbody>
      {(['champions', 'traits', 'items', 'augments', 'patch'] as const).map(key => <tr key={key}><th>{key}</th><td>{bundle[key].data.length}</td><td>{bundle[key].metadata.patch}</td><td><a href={bundle[key].metadata.sourceUrl} target="_blank" rel="noreferrer">{bundle[key].metadata.source}</a><small>{bundle[key].metadata.collectedAt}</small></td></tr>)}
      <tr><th>comps</th><td>{comps.length}</td><td>{[...new Set(comps.map(c => c.patch))].join(', ')}</td><td>{status.freshComps} fresh / {status.staleComps} stale · 人工维护</td></tr>
    </tbody></table></div>
    <p>英雄数量包含拉克丝的额外形态。Meta 来自 Diamond+ 终盘聚类，含不完整棋盘；未提供可信登场率，保留为空。运营规则是人工默认值。</p>
    <p>本地静态数据超过48小时、Meta超过72小时会提示 stale；这是采集新鲜度，不是服务器实时状态。更新失败可重新运行 <code>npm run data:update</code>，生产构建需重新 build。</p>
    <h2>阵容来源与审核记录</h2>
    {comps.map(c => <details key={c.id}><summary>{c.name} · {c.archetype} · {c.patch}</summary>
      <p>样本 {c.meta.sampleSize ?? '未知'}；均排 {c.meta.avgPlacement ?? '未知'}；前四率 {c.meta.top4Rate === undefined ? '未知' : `${(c.meta.top4Rate * 100).toFixed(1)}%`}；不完整棋盘 {c.meta.incompleteBoards ?? '未知'}。</p>
      <p>{c.curation.archetypeBasis}</p><ul>{c.curation.caveats.map(x => <li key={x}>{x}</li>)}</ul>
      {c.meta.sources.map(s => <p key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> · {s.rank} · {s.windowHours}h · {s.collectedAt}</p>)}
    </details>)}
    {!status.validation.ok && <pre role="alert">{status.validation.errors.join('\n')}</pre>}
    <footer><a href={bundle.patch.data[0].patchNotesUrl}>官方版本公告</a><p>{bundle.patch.data[0].patchAssociation}</p><p>源描述中的 @参数@ 为上游未解析占位符，不用于数值计算。</p></footer>
  </main>;
}
