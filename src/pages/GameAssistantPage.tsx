import { useEffect, useMemo, useRef, useState } from 'react';
import { loadData } from '../data';
import type { GameCatalog, SavedGame, GameState } from '../types/game';
import { clearGame, persistGame, restoreGame, type StoragePort } from '../utils/storage';
import { newGame, secondStage, validateGameInput } from '../utils/gameState';
import { analyzeGame } from '../engine/recommendationEngine';
import { FirstStageForm } from '../components/FirstStageForm';
import { SecondStageForm } from '../components/SecondStageForm';
import { AnalysisResults } from '../components/AnalysisResults';
function unavailableStorage(): StoragePort {
  return { getItem: () => { throw new Error('storage unavailable'); }, setItem: () => { throw new Error('storage unavailable'); }, removeItem: () => { throw new Error('storage unavailable'); } };
}
export function GameAssistantPage() {
  const repository = useMemo(() => {
    try { return { data: loadData(), error: null }; } catch (error) { return { data: null, error: String(error) }; }
  }, []);
  if (!repository.data) return <main className="assistant-shell"><h1>暂时无法读取本地数据</h1><p>{repository.error}</p><a href="/data-status">检查数据状态</a></main>;
  return <Assistant data={repository.data} />;
}
function Assistant({ data }: { data: ReturnType<typeof loadData> }) {
  const catalog: GameCatalog = useMemo(() => ({ bundle: data.bundle, comps: data.comps, currentPatch: data.status.current,
    staticValid: data.status.validation.ok && !data.status.staticVersionMismatch }), [data]);
  const storage = useMemo(() => { try { return window.localStorage; } catch { return unavailableStorage(); } }, []);
  const restored = useMemo(() => restoreGame(storage, catalog), [storage, catalog]);
  const [game, setGame] = useState<SavedGame>(restored.game), [notice, setNotice] = useState(restored.notice ?? '');
  const [saveOk, setSaveOk] = useState(true), [errors, setErrors] = useState<string[]>([]);
  const content = useRef<HTMLDivElement>(null);
  const second = game.view.startsWith('second');
  const state = second && game.second ? game.second : game.first;
  const isResult = game.view.endsWith('results');
  useEffect(() => { setSaveOk(persistGame(storage, game)); }, [storage, game]);
  useEffect(() => { setErrors([]); content.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }, [game.view]);
  const result = useMemo(() => {
    if (!isResult) return null;
    try { return analyzeGame(state, catalog); } catch (error) { return { error: String(error) }; }
  }, [state, isResult, catalog]);
  const firstResult = useMemo(() => {
    try { return analyzeGame(game.first, catalog); } catch { return null; }
  }, [game.first, catalog]);
  function updateFirst(first: GameState) { setGame(g => ({ ...g, first, second: null })); setErrors([]); }
  function updateSecond(next: GameState) { setGame(g => ({ ...g, second: next })); setErrors([]); }
  function analyze(stage: 'first' | 'second') {
    const input = stage === 'first' ? game.first : game.second;
    if (!input) return;
    const messages = validateGameInput(input, catalog);
    setErrors(messages);
    if (!messages.length) { setNotice(''); setGame(g => ({ ...g, view: `${stage}-results` })); }
  }
  function enterSecond() {
    setGame(g => ({ ...g, view: 'second-input', second: g.second ?? secondStage(g.first, firstResult?.routes[0]?.primaryCarryIds[0]) }));
    setNotice('已继承第一次输入；金币、血量、等级为预填值，请按当前局面修改。');
  }
  function reset() {
    const removed = clearGame(storage);
    setGame(newGame(catalog.currentPatch.set, catalog.currentPatch.patch)); setErrors([]);
    setNotice(removed ? '已清空上一局，开始新的对局。' : '当前页面已重置；浏览器阻止了本地存档清除，请留意刷新后状态。');
  }
  const statusClass = data.status.staticStatus === 'fresh' && data.status.metaStatus === 'fresh' ? 'fresh' : 'stale';
  return <main className="assistant-shell">
    <header className="app-header"><a href="/" className="brand"><span className="brand-mark" aria-hidden="true">T</span><span>TFT 上分助手<small>局内运营 · V0.1</small></span></a>
      <a className={`version-link ${statusClass}`} href="/data-status"><span className="status-dot" /> Set {catalog.currentPatch.set} · {catalog.currentPatch.patch}<small>数据状态 ↗</small></a></header>
    <nav className="stage-nav" aria-label="分析阶段"><button type="button" aria-current={!second ? 'step' : undefined} onClick={() => setGame(g => ({ ...g, view: 'first-input' }))}><span>01</span><div><b>第一次强化</b><small>2-1 · 保持方向</small></div></button>
      <span className="stage-connector" aria-hidden="true" /><button type="button" disabled={!firstResult} aria-current={second ? 'step' : undefined} onClick={enterSecond}><span>02</span><div><b>第二次强化</b><small>3-2 · 收敛路线</small></div></button>
    </nav>
    {(data.status.staticStatus !== 'fresh' || data.status.metaStatus !== 'fresh') && <div className="data-notice" role="status">部分数据已过期或上次更新失败。过期 Meta 不计入当前阵容建议。<a href="/data-status">查看详情</a></div>}
    {!saveOk && <div className="data-notice" role="alert">浏览器未允许保存，刷新可能丢失本局输入。当前分析仍可使用。</div>}
    {notice && <div className="session-notice" role="status"><span>{notice}</span><button type="button" aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div>}
    <div ref={content} tabIndex={-1} className="game-content">
      {!isResult && !second && <FirstStageForm key={game.savedAt} state={game.first} catalog={catalog} onChange={updateFirst} onAnalyze={() => analyze('first')} errors={errors} />}
      {!isResult && second && game.second && <SecondStageForm key={`${game.savedAt}-second`} state={game.second} catalog={catalog} onChange={updateSecond} onAnalyze={() => analyze('second')} onBack={() => setGame(g => ({ ...g, view: 'first-input' }))} errors={errors} />}
      {result && 'error' in result && <div className="input-errors" role="alert"><p>{result.error}</p><button type="button" className="secondary-button" onClick={() => setGame(g => ({ ...g, view: second ? 'second-input' : 'first-input' }))}>返回修改输入</button></div>}
      {result && !('error' in result) && <AnalysisResults result={result} state={state} catalog={catalog} onEdit={() => setGame(g => ({ ...g, view: second ? 'second-input' : 'first-input' }))} onSecond={!second ? enterSecond : undefined} />}
    </div>
    <footer className="app-footer"><div><span className={`save-indicator ${saveOk ? '' : 'save-failed'}`} />{saveOk ? '当前对局已保存在本机，刷新可恢复' : '本机保存不可用'}<small>确定性规则 · 不读取游戏进程 · 不上传对局</small></div>
      <button type="button" className="new-game" onClick={reset}>↺ 新开一局</button></footer>
  </main>;
}
