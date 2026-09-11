import type { Archetype } from '../../dataProviders/meta/types.ts';
export interface StrategyRule {
  compId: string; defaultRollLevel: number;
  rollStyle: 'slow-roll' | 'all-in' | 'stabilize' | 'no-roll';
  standardLeveling: { stage: string; level: number }[];
  conditions?: { minimumCopies?: number; maxContested?: number; recommendedGold?: number };
  pivotConditions?: string[];
  provenance: { basis: string; reviewedAt: string; patch: string };
}
// Human-authored starting rules, derived from the user's V0.1 design. These are
// heuristics, not scraped claims. No statistical provider writes this module.
const baseline: Record<Archetype, Omit<StrategyRule, 'compId' | 'provenance'>> = {
  reroll1: { defaultRollLevel: 5, rollStyle: 'slow-roll', standardLeveling: [{ stage: '3-1', level: 5 }], conditions: { minimumCopies: 5, maxContested: 1, recommendedGold: 50 }, pivotConditions: ['核心只有1～2张或出现2家以上同行时放弃强追三星', '低血量先提升场面质量，不机械卡50金币'] },
  reroll2: { defaultRollLevel: 6, rollStyle: 'slow-roll', standardLeveling: [{ stage: '2-1', level: 4 }, { stage: '2-5', level: 5 }, { stage: '3-2', level: 6 }], conditions: { minimumCopies: 5, maxContested: 1, recommendedGold: 50 }, pivotConditions: ['3-2前主C不足5张时重新评估', '2家以上同行或装备冲突时转备用路线'] },
  reroll3: { defaultRollLevel: 7, rollStyle: 'slow-roll', standardLeveling: [{ stage: '2-1', level: 4 }, { stage: '3-2', level: 6 }, { stage: '4-1', level: 7 }], conditions: { minimumCopies: 5, maxContested: 1, recommendedGold: 50 }, pivotConditions: ['七级核心数量不足或同行过多时转四费', '低血量优先两星保命，再评估追三'] },
  fast8: { defaultRollLevel: 8, rollStyle: 'stabilize', standardLeveling: [{ stage: '2-1', level: 4 }, { stage: '2-5', level: 5 }, { stage: '3-2', level: 6 }, { stage: '4-1', level: 7 }, { stage: '4-2', level: 8 }], conditions: { recommendedGold: 40 }, pivotConditions: ['低血量提前D牌补两星，不强等八级', '主C被多家争抢时使用共享装备的替代核心'] },
  fast9: { defaultRollLevel: 9, rollStyle: 'stabilize', standardLeveling: [{ stage: '3-2', level: 6 }, { stage: '4-2', level: 8 }, { stage: '5-2', level: 9 }], conditions: { recommendedGold: 50 }, pivotConditions: ['八级无法稳血时先补主C和主坦两星，延后升九', '不能把九五成型样本胜率理解为开局强行上九胜率'] },
  tempo: { defaultRollLevel: 6, rollStyle: 'stabilize', standardLeveling: [{ stage: '2-1', level: 4 }, { stage: '2-5', level: 5 }, { stage: '3-2', level: 6 }, { stage: '4-1', level: 7 }, { stage: '4-2', level: 8 }], conditions: { recommendedGold: 30 }, pivotConditions: ['强场面不为刷牌而刷牌，优先保留升级经济', '中期需要稳血时小D补质量，四费来牌决定最终路线'] },
};
const assignments: [string, Archetype][] = [
  ['set18-top4-1', 'reroll1'], ['set18-top4-2', 'fast9'], ['set18-top4-3', 'fast8'],
  ['set18-top4-4', 'fast8'], ['set18-top4-5', 'reroll2'], ['set18-top4-7', 'fast9'],
  ['set18-top4-8', 'tempo'], ['set18-top4-9', 'reroll3'], ['set18-top4-10', 'reroll3'],
  ['set18-top4-11', 'fast8'], ['set18-top4-13', 'fast8'], ['set18-top4-14', 'reroll2'],
  ['set18-top4-16', 'fast8'], ['set18-top4-17', 'reroll3'], ['set18-top4-18', 'fast9'], ['set18-top4-20', 'reroll3'],
];
export const strategyRules: StrategyRule[] = assignments.map(([compId, archetype]) => ({
  compId, ...baseline[archetype],
  provenance: { basis: '用户原始 V0.1 规则 + 人工运营默认值；尚未经过实战回测', reviewedAt: '2026-09-10T14:30:00Z', patch: '18.2' },
}));
