import type { PatchInfo } from '../data/types.ts';
import type { Comp, NormalizedCompMeta } from '../dataProviders/meta/types.ts';
import { normalizeCompMeta } from '../dataProviders/meta/index.ts';
import type { GameState, GameCatalog, AnalysisResult, ScoredRoute, RecommendedRoute } from '../types/game.ts';
import { suitabilityProfiles } from '../data/curated/suitabilityProfiles.ts';
import { augmentStrategyMetadata } from '../data/curated/augmentStrategyMetadata.ts';
import { strategyRules } from '../data/curated/strategyRules.ts';
import { scoreStrategy } from './strategyScoring.ts';
import { economyAdvice } from './economyRules.ts';
import { validateGameInput } from '../utils/gameState.ts';
export function getCurrentMetaCandidates(comps: Comp[], patch: Pick<PatchInfo, 'patch' | 'set'>, now = Date.now()): NormalizedCompMeta[] {
  return comps.map(c => normalizeCompMeta(c, patch)).filter(c => c.status === 'fresh' &&
    now - Date.parse(c.meta.collectedAt) <= 72 * 3600000 && Date.parse(c.meta.collectedAt) <= now);
}
export function analyzeGame(state: GameState, catalog: GameCatalog, now = Date.now()): AnalysisResult {
  const inputErrors = validateGameInput(state, catalog);
  if (inputErrors.length) throw new Error(inputErrors.join(' '));
  const fallback: AnalysisResult = {
    judgment: '先根据当前场面保留调整空间。', economy: 'B', lock: '低', routes: [], notices: [],
    fallbackAction: '场面弱先上两星、合能用的装备；没有可靠阵容依据时，不承诺追三或强行冲九。',
    excludedCount: catalog.comps.length, createdAt: new Date(now).toISOString(),
  };
  if (state.stage === 'second' && state.hp === 0) return { ...fallback, judgment: '血量已为0。', fallbackAction: '请确认血量输入；本局结束后点击「新开一局」。' };
  if (!catalog.staticValid) return { ...fallback, judgment: '当前静态数据未通过验证，暂不生成定向阵容建议。', notices: ['请查看数据状态并更新数据后重新分析。'] };
  const names = Object.fromEntries(catalog.bundle.champions.data.map(c => [c.id, c.name]));
  const selectedAugments = [state.augment1Id, state.augment2Id].filter(Boolean);
  const unknown = selectedAugments.filter(id => !augmentStrategyMetadata.some(a => a.augmentId === id));
  const notices = unknown.map(id => `${catalog.bundle.augments.data.find(a => a.id === id)?.name ?? id}尚无运营标注，评分按中性处理；游戏内特殊限制优先。`);
  // These augments alter the normal board/level rules. Do not issue normal
  // leveling instructions until their dedicated operational rules exist.
  if (selectedAugments.includes('DA_SoloLeveling')) return { ...fallback,
    judgment: '「独自升级」会改变正常上场人数，当前通用运营规则不适用。',
    fallbackAction: '先按强化符文的阶段限制布置当前弈子，效果结束后再使用常规路线分析。', notices };
  const candidates = getCurrentMetaCandidates(catalog.comps, catalog.currentPatch, now);
  const scored: ScoredRoute[] = [];
  for (const comp of candidates) {
    const profile = suitabilityProfiles.find(p => p.compId === comp.id);
    const rule = strategyRules.find(r => r.compId === comp.id && r.provenance.patch === catalog.currentPatch.patch);
    if (!profile || !rule || profile.requiredAugmentIds?.some(id => !selectedAugments.includes(id))) continue;
    scored.push(scoreStrategy(state, comp, profile, catalog));
  }
  scored.sort((a, b) => b.score - a.score || a.comp.id.localeCompare(b.comp.id));
  const chosen: ScoredRoute[] = [];
  if (state.stage === 'first') {
    for (const route of scored) {
      if (!chosen.some(r => r.archetype === route.archetype)) chosen.push(route);
      if (chosen.length === 3) break;
    }
  } else if (scored.length) {
    const main = scored[0]; chosen.push(main);
    // Prefer a backup with shared item direction and a different primary carry.
    const alternatives = scored.slice(1).filter(r => r.contested < 2 && !r.primaryCarryIds.some(id => main.primaryCarryIds.includes(id)));
    alternatives.sort((a, b) => {
      const fit = (r: ScoredRoute) => r.score + (r.damage === main.damage || r.damage === 'hybrid' || main.damage === 'hybrid' ? 8 : 0);
      return fit(b) - fit(a) || b.score - a.score || a.comp.id.localeCompare(b.comp.id);
    });
    if (alternatives[0]) chosen.push(alternatives[0]);
  }
  const routes: RecommendedRoute[] = chosen.map(route => ({ ...route,
    advice: economyAdvice(state, route, strategyRules.find(r => r.compId === route.comp.id)!),
    carryNames: route.primaryCarryIds.map(id => names[id]), tankNames: route.comp.tanks.map(id => names[id]), unitNames: names,
  }));
  if (!routes.length) return { ...fallback, judgment: '当前没有同时满足版本、运营规则与前提条件的阵容。',
    notices: [...notices, '过期 Meta 已排除；更新数据与人工阵容库后可恢复定向分析。'] };
  const main = routes[0];
  const lock = state.stage === 'first' ? '低' : main.primaryCopies >= 5 && main.contested === 0 && main.score >= 75 && !unknown.length ? '高' : '中';
  const economy = state.stage === 'second' ? (state.hp! < 40 || state.gold! < 20 ? 'C' : state.hp! >= 65 && state.gold! >= 40 ? 'A' : 'B')
    : selectedAugments.some(id => augmentStrategyMetadata.some(a => a.augmentId === id && a.type === 'economy')) || state.boardStrength === 'strong' ? 'A' : 'B';
  if (state.stage === 'second' && state.contested >= 2)
    notices.push(`${names[state.contestedUnitId!] ?? '目标核心'}有2家以上同行，已降低相关路线优先级；备用路线尽量避开主路线核心。`);
  notices.push('路线按输入适配度排序，不等于胜率。来源中的转职、光明装备或神器条件需另行满足。');
  return {
    judgment: state.stage === 'first' ? main.primaryCopies >= 5 && main.archetype.startsWith('reroll')
      ? `已有${main.carryNames.join(' / ')}追三信号；先留方向，3-2再决定是否锁定。`
      : '当前先保持灵活，留三条方向，不急着锁死最终阵容。'
      : state.hp! < 40 ? '血量已进入危险区，先补两星稳血，暂停理想化运营。'
      : `优先走「${main.title}」，同时保留一条换核心的备用路线。`,
    economy, lock, routes, notices, fallbackAction: fallback.fallbackAction,
    excludedCount: catalog.comps.length - scored.length, createdAt: new Date(now).toISOString(),
  };
}
