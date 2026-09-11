import type { GameCatalog, RecommendedRoute } from '../types/game';
import { EntityIcon } from './EntityIcon';
export function StrategyCard({ route, catalog, index, stage }: { route: RecommendedRoute; catalog: GameCatalog; index: number; stage: 'first' | 'second' }) {
  const label = stage === 'second' ? index === 0 ? '主路线' : '备用路线' : `方向 ${String(index + 1).padStart(2, '0')}`;
  const name = (id: string) => route.unitNames[id] ?? id;
  const rollType = route.archetype.startsWith('reroll') ? '追三' : route.archetype === 'tempo' ? '稳血' : '运营';
  return <article className={`strategy-card ${index === 0 ? 'primary-route' : ''}`} aria-label={`${label}：${route.title}`}>
    <div className="route-heading"><div><span className="route-label">{label}</span><h3>{route.title}</h3></div><div className="suitability"><strong>{route.score}</strong><span>适配分 / 100</span></div></div>
    <div className="route-meta"><span>{route.advice.rollLevel}级{rollType}</span><span>{route.damage === 'ap' ? '法系装备' : route.damage === 'ad' ? '物理装备' : '装备灵活'}</span><span>锁定前需满足条件</span></div>
    <p className="route-action"><span>当前行动</span>{route.advice.currentAction}</p>
    <div className="route-roles"><div><small>主C方向</small><div>{route.primaryCarryIds.map(id => {
      const unit = catalog.bundle.champions.data.find(c => c.id === id);
      return unit ? <span className="role-unit" key={id}><EntityIcon icon={unit.icon} name={unit.name} cost={unit.cost} /><b>{unit.name}</b></span> : null;
    })}</div></div><div><small>主坦目标</small><p>{route.tankNames.join(' / ')}</p></div></div>
    <div className="route-next"><span>下一节点</span><p>{route.advice.nextNode}</p></div>
    <details className="route-details"><summary>查看D牌预算、继续与转阵条件 <span aria-hidden="true">＋</span></summary><div className="detail-content">
      <h4>什么时候D</h4><p>{route.advice.rollWhen}</p><h4>D多少钱</h4><p>{route.advice.rollBudget}</p>
      <h4>人口节奏</h4><div className="level-timeline">{route.advice.leveling.map(p => <span key={p.stage}><small>{p.stage}</small><b>{p.level}级</b></span>)}</div>
      <p className="field-hint">节点是默认节奏；提前或延后，以当前血量、场面和升级费用为准。</p>
      <h4>继续条件</h4><ul>{route.advice.continueConditions.map(x => <li key={x}>{x}</li>)}</ul>
      <h4>放弃 / 转阵条件</h4><ul>{route.advice.pivotConditions.map(x => <li key={x}>{x}</li>)}</ul>
      <h4>装备处理</h4><p>{route.advice.itemPrinciple}</p>
      {stage === 'first' && <><h4>第二次强化前观察</h4><ul>{route.advice.observe.map(x => <li key={x}>{x}</li>)}</ul></>}
    </div></details>
    <details className="route-details"><summary>为什么推荐这条路线 <span aria-hidden="true">＋</span></summary><div className="detail-content score-explanation">
      {route.factors.map(f => <div key={f.label}><p><b>{f.label}</b><strong className={f.delta < 0 ? 'negative' : ''}>{f.delta > 0 ? '+' : ''}{f.delta}</strong></p><small>{f.detail}</small></div>)}
      <p className="field-hint">总分限制在0～100。适配分是可解释的启发式分数，不能解释为胜率。</p>
    </div></details>
    <details className="route-details"><summary>真实阵容参考与特殊前提 <span aria-hidden="true">＋</span></summary><div className="detail-content">
      <h4>{route.comp.name} · {route.comp.patch}</h4><p>核心：{route.comp.coreUnits.map(name).join('、')}</p>
      <p>可替换 / 后期补入：{route.comp.optionalUnits.map(name).join('、')}</p>
      <p className="field-hint">这是来源终盘的核心与替换池，不要求同时上场。</p>
      {route.comp.preferredItems?.map(p => <p key={p.unitId}>{name(p.unitId)}：{p.items.map(id => catalog.bundle.items.data.find(i => i.id === id)?.name ?? id).join('、')}</p>)}
      <ul className="source-caveats">{route.comp.curation.caveats.map(x => <li key={x}>{x}</li>)}</ul>
      <p>来源样本 {route.comp.meta.sampleSize ?? '未知'} · 均排 {route.comp.meta.avgPlacement ?? '未知'} · 含不完整棋盘 {route.comp.meta.incompleteBoards ?? '未知'}。</p>
      <p>这些统计仅供核对来源，本轮不计入适配分。</p>
      {route.comp.meta.sources.map(s => <a key={s.url} href={s.url} target="_blank" rel="noreferrer">{s.name} · {s.rank} · {s.collectedAt.slice(0, 10)} ↗</a>)}
    </div></details>
  </article>;
}
