// Human-authored equipment/route interpretation, separate from sampled outcomes.
// These profiles never contribute an invented Meta strength or win probability.
export interface SuitabilityProfile {
  compId: string; title: string; damage: 'ad' | 'ap' | 'hybrid';
  requiredAugmentIds?: string[];
}
export const suitabilityProfiles: SuitabilityProfile[] = [
  { compId: 'set18-top4-1', title: '一费追三 · 致命丽花', damage: 'ap', requiredAugmentIds: ['DA_18_FloraFatalisAugment'] },
  { compId: 'set18-top4-2', title: '物理九五 · 峡谷野怪', damage: 'ad' },
  { compId: 'set18-top4-3', title: '法系四费 · 索拉卡婕拉', damage: 'ap' },
  { compId: 'set18-top4-4', title: '混合四费 · 魔战士', damage: 'hybrid' },
  { compId: 'set18-top4-5', title: '二费追三 · 凯特琳', damage: 'ad' },
  { compId: 'set18-top4-7', title: '法系九五 · 拉露恩', damage: 'ap' },
  { compId: 'set18-top4-8', title: '中期节奏 · 灵活转四费', damage: 'hybrid' },
  { compId: 'set18-top4-9', title: '三费追三 · 雷恩加尔易', damage: 'ad' },
  { compId: 'set18-top4-10', title: '三费追三 · 护卫法系', damage: 'ap' },
  { compId: 'set18-top4-11', title: '物理四费 · 厄斐琉斯', damage: 'ad' },
  { compId: 'set18-top4-13', title: '法系四费 · 阿狸', damage: 'ap' },
  { compId: 'set18-top4-14', title: '二费追三 · 凯尔', damage: 'ap' },
  { compId: 'set18-top4-16', title: '混合四费 · 野兽之灵', damage: 'hybrid' },
  { compId: 'set18-top4-17', title: '三费追三 · 灵魂莲华易', damage: 'hybrid' },
  { compId: 'set18-top4-18', title: '物理九五 · 艾希希维尔', damage: 'ad' },
  { compId: 'set18-top4-20', title: '三费追三 · 崔丝塔娜', damage: 'ad' },
];
export const componentRoles: Record<string, 'ad' | 'ap' | 'flex' | 'tank' | 'special'> = {
  DA_Component_BFSword: 'ad', DA_Component_RecurveBow: 'ad',
  DA_Component_NeedlesslyLargeRod: 'ap', DA_Component_TearOfTheGoddess: 'ap',
  DA_Component_SparringGloves: 'flex', DA_Component_GiantsBelt: 'tank',
  DA_Component_ChainVest: 'tank', DA_Component_NegatronCloak: 'tank',
  DA_Component_Spatula: 'special', DA_Component_FryingPan: 'special',
};
