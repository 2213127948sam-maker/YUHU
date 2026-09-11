import type { StrategyRule } from '../data/curated/strategyRules.ts';
import type { EconomyAdvice, GameState, ScoredRoute } from '../types/game.ts';
export function rollLevel(rule: StrategyRule): number { return rule.defaultRollLevel; }
export function economyAdvice(state: GameState, route: ScoredRoute, rule: StrategyRule): EconomyAdvice {
  const reroll = route.archetype.startsWith('reroll');
  const level = state.level ?? 6, gold = state.gold ?? 0, hp = state.hp ?? 100;
  const target = rule.defaultRollLevel;
  const next = rule.standardLeveling.find(p => p.level > level && Number(p.stage.replace('-', '.')) >= 3.2);
  const advice: EconomyAdvice = {
    currentAction: '', nextNode: next ? `${next.stage}争取${next.level}级；升级前确认仍有买牌和稳血余钱。` : level >= 10 ? '已到10级，优先提升主C、主坦质量。' : `核心质量足够后，再考虑升${Math.min(10, level + 1)}级。`,
    rollLevel: target, rollWhen: reroll ? `${target}级且核心至少${rule.conditions?.minimumCopies ?? 5}张时，考虑追三。` : route.archetype === 'tempo' ? '中期场面不足时小D；转四费后在8级补质量。' : `${target}级启动；如果血量或场面撑不住，提前补两星。`,
    rollBudget: '现在不D，保留升级与买牌经济。', spendNow: 0, goldFloor: null,
    leveling: rule.standardLeveling, continueConditions: [
      ...(reroll ? [`目标核心至少${rule.conditions?.minimumCopies ?? 5}张，再考虑慢D。`, '目标核心同行不超过1家。'] : ['场面能稳血，升级后仍有D牌和买牌余钱。']),
      '输出装备方向合适，且满足该变体的特殊前提。',
    ], pivotConditions: rule.pivotConditions ?? [],
    observe: ['3-2前观察核心累计张数与同行变化。', '观察连败是否扩大、主坦能否撑到主C启动。', '第二次强化后重新判断，不沿用第一次结论硬追。'],
    itemPrinciple: route.damage === 'ap' ? '优先法系输出和回蓝方向；前排不足时先做能立即提升场面的坦装。'
      : route.damage === 'ad' ? '优先物理输出和攻速方向；先给当前两星打工，不为最终主C一直留散件。'
      : '保持物理与法系转向空间；先合当前阵容能用的战力装备。',
  };
  if (state.stage === 'first') {
    advice.currentAction = route.archetype === 'reroll1' ? '现在不D，暂不主动升人口；留目标一费，先存经济。'
      : route.archetype === 'tempo' && state.boardStrength === 'strong' ? '现在不D；有余钱就补人口，合适的装备先上场保连胜。'
      : '现在不D；留方向内关键牌，先合泛用战力装，不锁死最终阵容。';
    advice.nextNode = route.archetype === 'reroll1' ? '3-1检查一费核心张数，5级再决定是否追三。'
      : '2-5争取5级；3-2第二次强化后复盘来牌、血量和经济。';
    return advice;
  }
  if (hp === 0) return { ...advice, currentAction: '血量为0，请确认输入；本局结束后新开一局。', nextNode: '确认血量或重置当前对局。' };
  function spendTo(floor: number, action: string) {
    const safeFloor = Math.max(0, Math.min(gold, floor));
    advice.goldFloor = safeFloor;
    // This budget includes refreshing AND buying units, not a claimed roll count.
    advice.spendNow = gold - safeFloor;
    if (advice.spendNow < 2) {
      advice.spendNow = 0; advice.goldFloor = gold;
      advice.currentAction = `${gold < 2 ? '金币不足一次刷新' : '还没有可用于D牌的余钱'}；先用现有两星和装备提升场面。`;
      advice.rollBudget = `本回合暂不花钱刷新，保留${gold}金币。`;
    } else {
      advice.currentAction = action;
      advice.rollBudget = `D牌＋买牌总计最多花${advice.spendNow}金币，留${safeFloor}金币；主C和主坦到目标质量就提前停。`;
    }
  }
  if (reroll && route.primaryCopies >= 9 && hp >= 40) {
    advice.currentAction = '核心已有9张，停止为它追三；补主坦质量，准备上人口。';
    advice.rollWhen = '只有前排明显不足时才补质量，不再为已完成的核心刷新。';
    return advice;
  }
  if (hp < 40) {
    spendTo(0, '先保命：在当前等级D两星，立刻合能用的装备，暂停冲人口和硬追三星。');
    advice.nextNode = '主C、主坦先到两星；止住大掉血后再恢复升级节奏。';
    advice.rollWhen = '当前回合就要稳血，不等理想启动等级。';
    return advice;
  }
  if (state.boardStrength === 'weak' || (hp < 65 && level >= target)) {
    const floor = hp < 65 ? Math.min(15, Math.floor(gold / 2)) : Math.min(30, gold);
    spendTo(floor, hp < 65 ? '当前有掉血压力，先D主C和主坦两星；质量够了就停。' : '场面偏弱，小D补两星稳住；不要为了理想阵容把经济打空。');
    advice.rollWhen = `现在在${level}级补质量，核心追三仍需检查来牌和同行。`;
    if (route.archetype === 'fast9') advice.nextNode = '先把当前阵容补到能稳血，延后升九。';
    return advice;
  }
  if (reroll && level >= target) {
    if (route.contested >= 2 || route.primaryCopies < (rule.conditions?.minimumCopies ?? 5)) {
      advice.currentAction = route.contested >= 2 ? '两家以上同行，先停下追三；优先转共享装备的备用路线。' : '核心张数还不足以支持追三；先存经济，观察下一轮来牌。';
      advice.rollWhen = '来牌达到条件、同行减少后再评估，当前不承诺追三。';
    } else if (gold <= 50) {
      advice.currentAction = '先存到50金币，再用多出来的利息慢D；不要提前打穿经济。';
    } else {
      spendTo(50, '卡50金币慢D目标核心；每回合只花多出的经济，命中三星就停。');
      advice.rollWhen = `当前${level}级可以慢D，仍需每轮检查血量和同行。`;
    }
    return advice;
  }
  if (!reroll && level >= target && route.archetype !== 'tempo') {
    spendTo(30, `已经到${level}级，先补主C与主坦两星；第一轮D到30金币附近再评估。`);
    return advice;
  }
  advice.currentAction = route.archetype === 'tempo' && state.boardStrength === 'strong'
    ? '场面够强就不D，保留经济补人口，继续用两星打工维持节奏。'
    : `现在不D，继续存经济；${level < 6 ? '3-2优先争取6级' : '按下一升级节点准备'}，不要因为没来最终主C就急着刷新。`;
  if (!reroll && route.archetype !== 'tempo') advice.rollBudget = `现在预算0；未来到${target}级启动时，若血量仍≥65，可先D到30金币附近。`;
  return advice;
}
