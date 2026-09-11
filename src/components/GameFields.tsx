import type { Champion, Item, Augment } from '../data/types';
import type { GameState, UnitSignal, BoardStrength } from '../types/game';
import { augmentStrategyMetadata } from '../data/curated/augmentStrategyMetadata';
import { SearchPicker } from './SearchPicker';
import { EntityIcon } from './EntityIcon';
import { clampInteger } from '../utils/gameState';
export function AugmentPicker({ label, value, onChange, augments, excludedId }: { label: string; value?: string; onChange: (id?: string) => void; augments: Augment[]; excludedId?: string }) {
  const popular = ['DA_LevelUp', 'DA_PrismaticTicket', 'DA_Ascension', 'DA_PandorasItemsII', 'DA_PatientStudy', 'DA_18_FloraFatalisAugment'];
  const tiers: Record<string, string> = { silver: '银色', gold: '金色', prismatic: '棱彩' };
  const options = [...augments].filter(a => a.id !== excludedId).sort((a, b) => (popular.indexOf(a.id) < 0 ? 99 : popular.indexOf(a.id)) - (popular.indexOf(b.id) < 0 ? 99 : popular.indexOf(b.id)))
    .map(a => ({ value: a.id, label: a.name, badge: a.tier ? tiers[a.tier] : '', keywords: a.apiName,
      detail: augmentStrategyMetadata.some(m => m.augmentId === a.id) ? '已标注基础运营影响' : '可选 · 运营影响暂按中性处理' }));
  return <SearchPicker label={label} placeholder={`搜索名称，从 ${augments.length} 个真实强化中选择`} options={options} value={value} onChange={onChange} />;
}
const shortNames: Record<string, string> = { DA_Component_BFSword: '大剑', DA_Component_NeedlesslyLargeRod: '大棒', DA_Component_RecurveBow: '反曲弓', DA_Component_SparringGloves: '拳套', DA_Component_TearOfTheGoddess: '眼泪', DA_Component_ChainVest: '锁子甲', DA_Component_NegatronCloak: '魔抗', DA_Component_GiantsBelt: '腰带', DA_Component_Spatula: '金铲铲', DA_Component_FryingPan: '金锅锅' };
export function ComponentPicker({ components, items, onChange }: { components: GameState['components']; items: Item[]; onChange: (components: GameState['components']) => void }) {
  const sorted = Object.keys(shortNames).flatMap(id => items.filter(i => i.id === id));
  const total = Object.values(components).reduce((sum, n) => sum + n, 0);
  function adjust(id: string, delta: number) { const next = { ...components, [id]: clampInteger((components[id] ?? 0) + delta, 0, 9) }; if (!next[id]) delete next[id]; onChange(next); }
  return <section className="field-section"><div className="section-label"><h3>当前散件</h3><span>{total ? `已选 ${total} 件` : '点击增加，可重复选择'}</span></div>
    <div className="component-grid">{sorted.map(item => <div key={item.id} className={`component-cell ${components[item.id] ? 'selected' : ''}`}>
      <button type="button" className="component-add" aria-label={`添加${item.name}`} disabled={(components[item.id] ?? 0) >= 9} onClick={() => adjust(item.id, 1)}>
        <EntityIcon icon={item.icon} name={item.name} /><span>{shortNames[item.id]}</span><b>{components[item.id] ? `×${components[item.id]}` : '+'}</b>
      </button>
      {!!components[item.id] && <button className="component-minus" type="button" aria-label={`减少${item.name}`} onClick={() => adjust(item.id, -1)}>−</button>}
    </div>)}</div>
  </section>;
}
const quickUnits = ['DA_18_Veigar', 'DA_18_Kayle', 'DA_18_Caitlyn', 'DA_18_MasterYi_AD', 'DA_18_Rengar', 'DA_18_Ahri'];
export function UnitPicker({ units, champions, onChange }: { units: UnitSignal[]; champions: Champion[]; onChange: (units: UnitSignal[]) => void }) {
  function add(id?: string) {
    if (!id) return;
    if (units.some(u => u.unitId === id)) onChange(units.map(u => u.unitId === id ? { ...u, count: Math.min(9, u.count + 1) } : u));
    else onChange([...units, { unitId: id, count: 1, starred: 1 }]);
  }
  function setCount(id: string, count: number) {
    onChange(units.flatMap(u => u.unitId !== id ? [u] : count <= 0 ? [] : [{ ...u, count: clampInteger(count, 1, 9), starred: count < 3 ? 1 : count < 9 && u.starred === 3 ? 2 : u.starred }]));
  }
  return <section className="field-section"><div className="section-label"><h3>已有关键棋子</h3><span>只录关键牌，不必填满棋盘</span></div>
    <SearchPicker label="搜索英雄" placeholder="输入中文名或英文名，选中后添加1张" options={champions.map(c => ({ value: c.id, label: c.name, badge: `${c.cost}费`, keywords: c.apiName }))} onChange={add} clearAfterPick />
    <div className="quick-units"><span>快捷添加</span>{quickUnits.flatMap(id => champions.filter(c => c.id === id)).map(c => <button type="button" key={c.id} onClick={() => add(c.id)}>{c.name} <span>+</span></button>)}</div>
    {!units.length ? <div className="unit-empty">还没来关键牌也没关系，保持灵活。</div> : <div className="unit-list">{units.map(u => {
      const c = champions.find(c => c.id === u.unitId); if (!c) return null;
      return <div key={u.unitId} className="unit-row"><EntityIcon icon={c.icon} name={c.name} cost={c.cost} />
        <div className="unit-identity"><strong>{c.name}</strong><button type="button" className={`star-toggle ${u.starred > 1 ? 'active' : ''}`} aria-label={`${c.name}设为两星`}
          onClick={() => onChange(units.map(x => x.unitId === u.unitId ? { ...x, count: Math.max(3, x.count), starred: 2 } : x))}>{u.starred > 1 ? '★'.repeat(u.starred) : '设为2星'}</button></div>
        <div className="stepper"><button type="button" aria-label={`减少${c.name}张数`} onClick={() => setCount(u.unitId, u.count - 1)}>−</button><output aria-label={`${c.name}总张数`}>{u.count}<small>张</small></output><button type="button" aria-label={`增加${c.name}张数`} disabled={u.count >= 9} onClick={() => setCount(u.unitId, u.count + 1)}>+</button></div>
        <button type="button" className="remove-unit" aria-label={`移除${c.name}`} onClick={() => setCount(u.unitId, 0)}>×</button>
      </div>;
    })}</div>}
    <p className="field-hint">总张数包含合星用掉的牌：2星计3张，3星计9张。</p>
  </section>;
}
export function BoardSelector({ value, onChange }: { value: BoardStrength; onChange: (value: BoardStrength) => void }) {
  return <fieldset className="field-section"><legend>当前场面质量</legend><div className="board-options">
    {([['strong', '强', '两星多，能赢回合'], ['average', '一般', '有输有赢'], ['weak', '弱', '连续掉血，缺两星']] as const).map(([key, title, desc]) =>
      <button type="button" key={key} aria-pressed={value === key} className={value === key ? 'active' : ''} onClick={() => onChange(key)}><b>{title}</b><small>{desc}</small></button>)}
  </div></fieldset>;
}
export function NumberField({ label, value, onChange, min, max, suffix }: { label: string; value?: number; onChange: (n?: number) => void; min: number; max: number; suffix: string }) {
  return <label className="number-field"><span>{label}</span><div><input type="number" inputMode="numeric" min={min} max={max} step={1} required value={value ?? ''} aria-label={label}
    onChange={e => onChange(e.target.value === '' ? undefined : clampInteger(Number(e.target.value), min, max))} /><small>{suffix}</small></div></label>;
}
