import type { GameCatalog, GameState } from '../types/game';
import { AugmentPicker, NumberField, UnitPicker, BoardSelector, ComponentPicker } from './GameFields';
export function SecondStageForm({ state, catalog, onChange, onAnalyze, onBack, errors }: { state: GameState; catalog: GameCatalog; onChange: (state: GameState) => void; onAnalyze: () => void; onBack: () => void; errors: string[] }) {
  const firstAugment = catalog.bundle.augments.data.find(a => a.id === state.augment1Id);
  return <form noValidate onSubmit={e => { e.preventDefault(); onAnalyze(); }} className="game-form">
    <div className="form-heading"><span className="node-badge">3-2</span><div><h2>第二次强化后，收敛路线</h2><p>沿用第一次输入，只改发生变化的信息。</p></div></div>
    <div className="carryover"><span>已保留</span><b>{firstAugment?.name ?? '第一强化未选'}</b><span>· 散件与关键牌</span><button type="button" onClick={onBack}>修改第一次输入</button></div>
    <div className="form-panel augment-panel"><AugmentPicker label="第二个强化符文" value={state.augment2Id} excludedId={state.augment1Id} augments={catalog.bundle.augments.data} onChange={id => onChange({ ...state, augment2Id: id })} /></div>
    <div className="form-columns"><div className="form-panel"><div className="number-grid">
      <NumberField label="当前金币" value={state.gold} onChange={gold => onChange({ ...state, gold })} min={0} max={999} suffix="金币" />
      <NumberField label="当前血量" value={state.hp} onChange={hp => onChange({ ...state, hp })} min={0} max={100} suffix="HP" />
      <NumberField label="当前等级" value={state.level} onChange={level => onChange({ ...state, level })} min={2} max={10} suffix="级" />
    </div><p className="field-hint">预填6级、40金币、80血，请按实际局面修改。</p>
    <fieldset className="field-section"><legend>目标核心的同行</legend><label className="contested-target"><span>正在观察</span><select aria-label="同行目标英雄" value={state.contestedUnitId ?? ''} onChange={e => onChange({ ...state, contestedUnitId: e.target.value || undefined })}><option value="">选择主C</option>{catalog.bundle.champions.data.map(c => <option key={c.id} value={c.id}>{c.name} · {c.cost}费</option>)}</select></label>
      <div className="contested-options">{([0, 1, 2] as const).map(n => <button key={n} type="button" aria-pressed={state.contested === n} className={state.contested === n ? 'active' : ''} onClick={() => onChange({ ...state, contested: n })}>{n === 2 ? '2+' : n}<small>家同行</small></button>)}</div>
    </fieldset><BoardSelector value={state.boardStrength} onChange={boardStrength => onChange({ ...state, boardStrength })} /></div>
    <div className="form-panel"><UnitPicker units={state.units} champions={catalog.bundle.champions.data} onChange={units => onChange({ ...state, units })} /><details className="edit-components"><summary>更新散件 · 已继承第一次选择</summary><ComponentPicker components={state.components} items={catalog.bundle.items.data} onChange={components => onChange({ ...state, components })} /></details></div></div>
    {errors.length > 0 && <div className="input-errors" role="alert">{errors.map(e => <p key={e}>{e}</p>)}</div>}
    <div className="form-action"><p>给出主路线＋备用路线，先看当下行动。</p><button type="submit" className="primary-button">生成最终运营方案 <span aria-hidden="true">→</span></button></div>
  </form>;
}
