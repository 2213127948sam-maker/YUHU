import type { GameCatalog, GameState } from '../types/game';
import { AugmentPicker, BoardSelector, ComponentPicker, UnitPicker } from './GameFields';
export function FirstStageForm({ state, catalog, onChange, onAnalyze, errors }: { state: GameState; catalog: GameCatalog; onChange: (state: GameState) => void; onAnalyze: () => void; errors: string[] }) {
  return <form noValidate onSubmit={e => { e.preventDefault(); onAnalyze(); }} className="game-form">
    <div className="form-heading"><span className="node-badge">2-1</span><div><h2>第一次强化后，先看方向</h2><p>选海克斯、点散件、留几张关键牌。其余交给规则判断。</p></div></div>
    <div className="form-panel augment-panel"><AugmentPicker label="第一个强化符文" value={state.augment1Id} augments={catalog.bundle.augments.data} onChange={id => onChange({ ...state, augment1Id: id })} /></div>
    <div className="form-columns"><div className="form-panel"><ComponentPicker components={state.components} items={catalog.bundle.items.data} onChange={components => onChange({ ...state, components })} /><BoardSelector value={state.boardStrength} onChange={boardStrength => onChange({ ...state, boardStrength })} /></div>
      <div className="form-panel"><UnitPicker units={state.units} champions={catalog.bundle.champions.data} onChange={units => onChange({ ...state, units })} /></div></div>
    {errors.length > 0 && <div className="input-errors" role="alert">{errors.map(e => <p key={e}>{e}</p>)}</div>}
    <div className="form-action"><p>第一次只给方向，不锁阵容。</p><button className="primary-button" type="submit">第一次分析 <span aria-hidden="true">→</span></button></div>
  </form>;
}
