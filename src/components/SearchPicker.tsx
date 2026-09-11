import { useEffect, useId, useRef, useState } from 'react';
export interface PickerOption { value: string; label: string; detail?: string; badge?: string; keywords?: string }
interface Props {
  label: string; placeholder: string; options: PickerOption[]; value?: string;
  onChange: (value: string | undefined) => void; clearAfterPick?: boolean;
}
export function SearchPicker({ label, placeholder, options, value, onChange, clearAfterPick }: Props) {
  const id = useId(), container = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const selectedLabel = options.find(o => o.value === value)?.label;
  const [query, setQuery] = useState(selectedLabel ?? ''), [open, setOpen] = useState(false), [active, setActive] = useState(0);
  useEffect(() => { if (value && selectedLabel) setQuery(selectedLabel); }, [value, selectedLabel]);
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close);
  }, []);
  const needle = query.trim().toLowerCase();
  const matching = options.filter(o => !needle || `${o.label} ${o.keywords ?? ''}`.toLowerCase().includes(needle));
  const shown = matching.slice(0, 8);
  function select(option: PickerOption) { onChange(option.value); setQuery(clearAfterPick ? '' : option.label); setOpen(false); setActive(0); }
  return <div className="search-picker" ref={container}>
    <label htmlFor={id} className="field-label">{label}</label>
    <div className={`search-input ${value ? 'has-value' : ''}`}><span aria-hidden="true" className="search-symbol">⌕</span>
      <input id={id} ref={input} role="combobox" autoComplete="off" placeholder={placeholder} value={query}
        aria-expanded={open} aria-autocomplete="list" aria-controls={`${id}-list`}
        aria-activedescendant={open && shown[active] ? `${id}-option-${active}` : undefined}
        onFocus={() => { setOpen(true); setActive(0); }}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActive(0); if (value) onChange(undefined); }}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); return; }
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault(); setOpen(true); setActive(a => Math.max(0, Math.min(shown.length - 1, a + (e.key === 'ArrowDown' ? 1 : -1))));
          }
          if (e.key === 'Enter' && open) { e.preventDefault(); if (shown[active]) select(shown[active]); }
        }} />
      {query && <button type="button" className="clear-search" aria-label={`清除${label}`} onClick={() => { onChange(undefined); setQuery(''); setOpen(true); input.current?.focus(); }}>×</button>}
    </div>
    {open && <div className="picker-menu"><ul role="listbox" id={`${id}-list`} aria-label={`${label}搜索结果`}>
      {shown.map((o, index) => <li key={o.value} id={`${id}-option-${index}`} role="option" aria-selected={index === active}
        onPointerDown={e => e.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => select(o)}>
        <span><b>{o.label}</b>{o.detail && <small>{o.detail}</small>}</span>{o.badge && <span className="option-badge">{o.badge}</span>}
      </li>)}
      {!shown.length && <li className="empty-option">没有匹配项，试试中文名或英文名。</li>}
    </ul><p className="picker-hint">{matching.length} 个匹配 · ↑↓ 选择，Enter 确认</p></div>}
  </div>;
}
