import type { AnalysisResult, GameCatalog, GameState } from '../types/game';
import { StrategyCard } from './StrategyCard';
export function AnalysisResults({ result, state, catalog, onEdit, onSecond }: { result: AnalysisResult; state: GameState; catalog: GameCatalog; onEdit: () => void; onSecond?: () => void }) {
  const main = result.routes[0], backup = result.routes[1];
  const board = { strong: '强', average: '一般', weak: '弱' }[state.boardStrength];
  return <section className="analysis-results" aria-label={state.stage === 'first' ? '第一次分析结果' : '最终运营方案'}>
    <div className="results-heading"><div><p className="eyebrow">{state.stage === 'first' ? '2-1 / 方向判断' : '3-2 / 主线与备选'}</p><h2>{result.judgment}</h2></div><button type="button" className="secondary-button" onClick={onEdit}>修改本次输入</button></div>
    <div className="game-status"><span>经济倾向 <b>{result.economy}</b></span><span>场面 <b>{board}</b></span><span>锁定程度 <b>{result.lock}</b></span>{state.stage === 'second' && <span>{state.hp} HP <i>·</i> {state.gold} 金币 <i>·</i> {state.level}级</span>}</div>
    <div className={`current-action ${state.stage === 'second' && (state.hp ?? 100) < 40 ? 'urgent' : ''}`}>
      <span className="action-label"><span aria-hidden="true">↗</span> 现在做什么</span><h3>{main?.advice.currentAction ?? result.fallbackAction}</h3>
      {main && <div className="action-grid"><div><span>下一升级节点</span><p>{main.advice.nextNode}</p></div><div><span>什么时候D</span><p>{main.advice.rollWhen}</p></div><div><span>D多少钱</span><p>{main.advice.rollBudget}</p></div></div>}
    </div>
    {state.stage === 'second' && main && <div className="target-panel"><div><span className="eyebrow">成型优先级</span><p><b>① {main.carryNames.join(' / ')}两星</b> <span>→</span> ② {main.tankNames.join(' / ')}两星 <span>→</span> ③ 补关键羁绊 <span>→</span> ④ 再评估追三或人口</p><p>最终核心尚未到场时，先用现有两星输出和前排打工；不要在低等级硬找高费目标。已达标的棋子直接跳过。</p></div>
      {backup && <p className="pivot-callout">转阵提醒：{main.carryNames.join(' / ')}来牌不足、出现2家以上同行，或不满足特殊前提时，优先评估「{backup.title}」。确认备用核心与装备能接上后再换。</p>}
    </div>}
    {onSecond && <div className="continue-bar"><p>先按方向打到3-2，第二次强化后再收敛。</p><button type="button" className="primary-button" onClick={onSecond}>进入第二次强化分析 <span aria-hidden="true">→</span></button></div>}
    <div className={`routes-grid ${state.stage === 'second' ? 'two-routes' : ''}`}>{result.routes.map((route, index) => <StrategyCard key={route.comp.id} route={route} catalog={catalog} index={index} stage={state.stage} />)}</div>
    {result.routes.length > 0 && state.stage === 'first' && result.routes.length < 3 && <p className="data-notice">当前只有{result.routes.length}种满足前提的运营方向，不补造第三条路线。</p>}
    <div className="analysis-notices">{result.notices.map(n => <p key={n}>{n}</p>)}<p>运营建议采用人工规则，未经过实战回测；升级建议不估算未输入的当前经验值。</p></div>
  </section>;
}
