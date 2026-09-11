import type { Comp } from '../dataProviders/meta/types.ts';
import type { GameState, GameCatalog, ScoredRoute, ScoreFactor } from '../types/game.ts';
import { componentRoles, type SuitabilityProfile } from '../data/curated/suitabilityProfiles.ts';
import { augmentStrategyMetadata } from '../data/curated/augmentStrategyMetadata.ts';
import { clampInteger } from '../utils/gameState.ts';
export function scoreStrategy(state: GameState, comp: Comp, profile: SuitabilityProfile, catalog: GameCatalog): ScoredRoute {
  const factors: ScoreFactor[] = [{ label: '基础', delta: 50, detail: '所有路线从50分开始；没有使用阵容 Tier 或样本胜率加分。' }];
  const reroll = comp.archetype.startsWith('reroll');
  const chosen = [state.augment1Id, state.augment2Id].filter(Boolean);
  const annotations = chosen.flatMap(id => augmentStrategyMetadata.filter(a => a.augmentId === id));
  let augmentScore = 0;
  for (const a of annotations) {
    if (comp.preferredAugments?.includes(a.augmentId)) augmentScore += 20;
    else if (a.type === 'economy') augmentScore += comp.archetype === 'fast8' || comp.archetype === 'fast9' ? 20 : ['reroll1', 'reroll2'].includes(comp.archetype) ? -15 : 5;
    else if (a.type === 'reroll') augmentScore += reroll ? 20 : 5;
    else if (a.type === 'combat') augmentScore += comp.archetype === 'tempo' ? 20 : 10;
    else if (a.type === 'item' || a.type === 'flexible') augmentScore += 10;
  }
  factors.push({ label: '强化适配', delta: clampInteger(augmentScore, -30, 30), detail: annotations.length
    ? '仅使用已人工标注的强化类型，两次强化合计限制在−30至+30分。' : '当前强化尚无运营标注，按中性处理。' });
  const parts = { ad: 0, ap: 0, flex: 0, tank: 0, special: 0 };
  for (const [id, count] of Object.entries(state.components)) { const role = componentRoles[id]; if (role) parts[role] += count; }
  const carryCount = (profile.damage === 'hybrid' ? Math.max(parts.ad, parts.ap) : parts[profile.damage]) + parts.flex;
  const totalOffense = parts.ad + parts.ap + parts.flex;
  const adjustable = annotations.some(a => a.tags?.includes('装备可调整'));
  const itemScore = carryCount >= 2 ? 15 : carryCount ? 5 : totalOffense >= 2 && !adjustable ? -10 : parts.tank || adjustable ? 5 : 0;
  factors.push({ label: '散件适配', delta: itemScore, detail: itemScore > 5 ? '至少两件散件支持这条输出方向。'
    : itemScore < 0 ? '现有输出散件偏向另一种伤害类型。' : totalOffense + parts.tank ? '散件仍较灵活，优先做能立即上场的装备。' : '尚未录入散件，装备项不加减分。' });
  const unitById = new Map(catalog.bundle.champions.data.map(c => [c.id, c]));
  const cost = reroll ? Number(comp.archetype.at(-1)) : undefined;
  const primaryCarryIds = comp.carries.filter(id => cost === undefined || unitById.get(id)?.cost === cost);
  const primaryCopies = Math.max(0, ...state.units.filter(u => primaryCarryIds.includes(u.unitId)).map(u => u.count));
  const unitScore = primaryCopies >= 5 ? 20 : primaryCopies >= 2 ? 10 : primaryCopies ? 5 : 0;
  factors.push({ label: '关键来牌', delta: unitScore, detail: primaryCopies ? `目标核心已持有${primaryCopies}张（含合星所用张数）。` : '尚未持有目标核心，不根据想象中的来牌加分。' });
  let board = 0;
  if (state.boardStrength === 'strong' && ['tempo', 'fast8'].includes(comp.archetype)) board = 10;
  if (state.boardStrength === 'weak') board = comp.archetype === 'fast9' ? -15 : reroll ? 5 : 0;
  factors.push({ label: '场面质量', delta: board, detail: state.boardStrength === 'weak' && comp.archetype === 'fast9' ? '场面偏弱，直接冲九的风险高。' : '采用你手动选择的场面强度。' });
  // Contested input refers to one named core, not every route in the lobby.
  const contested = state.stage === 'second' && state.contestedUnitId && comp.carries.includes(state.contestedUnitId) ? state.contested : 0;
  factors.push({ label: '同行压力', delta: contested === 2 ? reroll ? -30 : -20 : contested === 1 ? reroll ? -12 : -8 : 0,
    detail: contested ? `${unitById.get(state.contestedUnitId!)?.name ?? '目标核心'}有${contested === 2 ? '2家以上' : '1家'}同行，追三星路线惩罚更高。` : '没有录入针对这条路线核心的同行。' });
  if (state.stage === 'second' && (state.hp ?? 100) < 40 && comp.archetype === 'fast9')
    factors.push({ label: '低血量限制', delta: -20, detail: '低于40血先稳血，降低直接上九优先级。' });
  return { comp, archetype: comp.archetype, title: profile.title, damage: profile.damage,
    score: clampInteger(factors.reduce((sum, f) => sum + f.delta, 0), 0, 100), factors, primaryCarryIds, primaryCopies, contested };
}
