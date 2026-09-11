import test from 'node:test';
import assert from 'node:assert/strict';
import { staticSchema, compsSchema } from '../src/data/schema.ts';
import bundleJson from '../src/data/generated/bundle.json';
import compsJson from '../src/data/curated/comps.json';
import { analyzeGame } from '../src/engine/recommendationEngine.ts';
import { scoreStrategy } from '../src/engine/strategyScoring.ts';
import { economyAdvice } from '../src/engine/economyRules.ts';
import { strategyRules } from '../src/data/curated/strategyRules.ts';
import { suitabilityProfiles } from '../src/data/curated/suitabilityProfiles.ts';
import { newGame, secondStage, clampInteger, validateGameInput } from '../src/utils/gameState.ts';
import { restoreGame, persistGame, clearGame, STORAGE_KEY, type StoragePort } from '../src/utils/storage.ts';
import type { GameCatalog, GameState } from '../src/types/game.ts';
const bundle = staticSchema.parse(bundleJson.data[0]);
const comps = compsSchema.parse(compsJson);
const catalog: GameCatalog = { bundle, comps, currentPatch: bundle.patch.data[0], staticValid: true };
const now = Date.parse(bundle.champions.metadata.collectedAt);
function first(): GameState { return { ...newGame('18', '18.2').first, augment1Id: 'DA_PrismaticTicket',
  components: { DA_Component_RecurveBow: 1, DA_Component_NeedlesslyLargeRod: 1, DA_Component_TearOfTheGoddess: 1 },
  units: [{ unitId: 'DA_18_Kayle', count: 5, starred: 2 }] }; }
function second(): GameState { return { ...secondStage(first(), 'DA_18_Kayle'), augment2Id: 'DA_Ascension', gold: 60 }; }
function score(state: GameState, id: string) {
  const comp = comps.find(c => c.id === id)!;
  return scoreStrategy(state, comp, suitabilityProfiles.find(p => p.compId === id)!, catalog);
}
test('first analysis yields three distinct directions and keeps commitment low', () => {
  const result = analyzeGame(first(), catalog, now);
  assert.equal(result.routes.length, 3); assert.equal(new Set(result.routes.map(r => r.archetype)).size, 3);
  assert.equal(result.routes[0].archetype, 'reroll2'); assert.equal(result.lock, '低');
  assert.match(result.routes[0].advice.currentAction, /现在不D/);
});
test('second analysis yields a main and item-compatible backup with different core carries', () => {
  const result = analyzeGame(second(), catalog, now);
  assert.equal(result.routes.length, 2);
  const [main, backup] = result.routes;
  assert.ok(!main.primaryCarryIds.some(id => backup.primaryCarryIds.includes(id)));
  assert.ok(main.damage === backup.damage || backup.damage === 'hybrid');
  assert.equal(main.advice.spendNow, 10); assert.equal(main.advice.goldFloor, 50);
});
test('equipment, copies and matching augment change suitability; source win rate never changes scores', () => {
  const stronger = first(); const base = { ...first(), units: [], components: {} };
  assert.ok(score(stronger, 'set18-top4-14').score > score(base, 'set18-top4-14').score);
  const changed = { ...catalog, comps: structuredClone(comps) };
  changed.comps.forEach(c => { c.meta.avgPlacement = 1; c.meta.winRate = 1; c.meta.top4Rate = 1; c.meta.sampleSize = 1000000; });
  assert.deepEqual(analyzeGame(first(), changed, now).routes.map(r => r.score), analyzeGame(first(), catalog, now).routes.map(r => r.score));
});
test('contested penalty applies to named carry, reroll penalty is higher, backup avoids two-contested target', () => {
  const state = { ...second(), contested: 2 as const };
  assert.equal(score(state, 'set18-top4-14').factors.find(f => f.label === '同行压力')!.delta, -30);
  assert.equal(score(state, 'set18-top4-10').factors.find(f => f.label === '同行压力')!.delta, 0);
  const result = analyzeGame(state, catalog, now);
  assert.ok(!result.routes[1].primaryCarryIds.includes('DA_18_Kayle'));
  assert.ok(result.notices.some(n => n.includes('2家以上同行')));
});
test('conditional Flora route requires the actual augment', () => {
  const state = first(); state.units = [{ unitId: 'DA_18_Veigar', count: 7, starred: 2 }];
  assert.ok(!analyzeGame(state, catalog, now).routes.some(r => r.comp.id === 'set18-top4-1'));
  state.augment1Id = 'DA_18_FloraFatalisAugment';
  assert.ok(analyzeGame(state, catalog, now).routes.some(r => r.comp.id === 'set18-top4-1'));
});
test('stale Meta, stale strategy versions or invalid static data cannot provide current routes', () => {
  assert.equal(analyzeGame(first(), { ...catalog, currentPatch: { set: '18', patch: '18.3' } }, now).routes.length, 0);
  assert.equal(analyzeGame(first(), catalog, now + 96 * 3600000).routes.length, 0);
  assert.equal(analyzeGame(first(), { ...catalog, staticValid: false }, now).routes.length, 0);
});
test('danger HP stabilizes immediately even when the reroll core is already complete', () => {
  const state = second(); state.hp = 30; state.gold = 25; state.units[0].count = 9;
  const result = analyzeGame(state, catalog, now);
  assert.match(result.routes[0].advice.currentAction, /先保命/);
  assert.equal(result.routes[0].advice.spendNow, 25); assert.equal(result.routes[0].advice.goldFloor, 0);
  assert.match(result.routes[0].advice.nextNode, /再恢复升级/);
});
test('every generated D budget is finite, nonnegative and affordable across HP/gold boundaries', () => {
  for (const hp of [1, 39, 40, 64, 65, 100]) for (const gold of [0, 1, 10, 20, 30, 50, 60, 999]) {
    const state = { ...second(), hp, gold, boardStrength: 'weak' as const };
    for (const route of analyzeGame(state, catalog, now).routes) {
      assert.ok(Number.isFinite(route.advice.spendNow));
      assert.ok(route.advice.spendNow >= 0 && route.advice.spendNow <= gold);
      if (route.advice.goldFloor !== null) assert.equal(route.advice.spendNow + route.advice.goldFloor, gold);
      if (gold < 2) assert.equal(route.advice.spendNow, 0);
    }
  }
});
test('reroll cannot spend below 50 when healthy; poor copies do not promise a chase', () => {
  const state = second(); state.gold = 40;
  const rule = strategyRules.find(r => r.compId === 'set18-top4-14')!;
  assert.equal(economyAdvice(state, score(state, rule.compId), rule).spendNow, 0);
  state.units[0].count = 2; state.units[0].starred = 1;
  assert.match(economyAdvice(state, score(state, rule.compId), rule).currentAction, /张数还不足/);
});
test('completed healthy carry stops chasing; leveling advice never asks to return to stage 2', () => {
  const state = second(); state.units[0].count = 9;
  const rule = strategyRules.find(r => r.compId === 'set18-top4-14')!;
  assert.match(economyAdvice(state, score(state, rule.compId), rule).currentAction, /停止/);
  assert.equal(economyAdvice(state, score(state, rule.compId), rule).spendNow, 0);
  const early = { ...second(), level: 2 };
  for (const route of analyzeGame(early, catalog, now).routes) assert.ok(!route.advice.nextNode.startsWith('2-'));
});
test('invalid numeric/foreign inputs are rejected, and HP zero offers reset instead of routes', () => {
  for (const value of [NaN, Infinity, -1, 1000]) assert.ok(validateGameInput({ ...second(), gold: value }, catalog).length);
  assert.ok(validateGameInput({ ...second(), level: undefined }, catalog).length);
  assert.ok(validateGameInput({ ...first(), units: [{ unitId: 'mock', count: 1, starred: 1 }] }, catalog).length);
  assert.ok(validateGameInput({ ...second(), augment2Id: 'DA_PrismaticTicket' }, catalog).length);
  assert.throws(() => analyzeGame({ ...second(), hp: Infinity }, catalog, now), /无效数字/);
  assert.equal(analyzeGame({ ...second(), hp: 0 }, catalog, now).routes.length, 0);
  assert.equal(clampInteger(-2, 0, 100), 0); assert.equal(clampInteger(500, 0, 100), 100);
});
function memoryStorage(): StoragePort { const data = new Map<string, string>(); return {
  getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value); }, removeItem: key => { data.delete(key); },
}; }
test('both stages, numbers and result view survive reload; reset removes prior game', () => {
  const storage = memoryStorage();
  const game = { ...newGame('18', '18.2'), first: first(), second: second(), view: 'second-results' as const };
  assert.equal(persistGame(storage, game), true);
  const restored = restoreGame(storage, catalog).game;
  assert.equal(restored.view, 'second-results'); assert.deepEqual(restored.first.units, game.first.units);
  assert.deepEqual(restored.second, game.second); assert.equal(restored.first.augment1Id, game.first.augment1Id);
  assert.equal(clearGame(storage), true); assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.equal(restoreGame(storage, catalog).game.view, 'first-input');
});
test('broken storage, corrupt JSON and stale IDs do not crash or restore stale outputs', () => {
  const unavailable: StoragePort = { getItem() { throw new Error(); }, setItem() { throw new Error(); }, removeItem() { throw new Error(); } };
  assert.equal(persistGame(unavailable, newGame('18', '18.2')), false);
  assert.equal(restoreGame(unavailable, catalog).game.view, 'first-input');
  const storage = memoryStorage(); storage.setItem(STORAGE_KEY, '{corrupted');
  assert.equal(restoreGame(storage, catalog).game.view, 'first-input');
  const stale = { ...newGame('17', '17.9'), first: first(), second: second(), view: 'second-results' };
  stale.first.units.push({ unitId: 'removed-unit', count: 1, starred: 1 });
  storage.setItem(STORAGE_KEY, JSON.stringify(stale));
  const restored = restoreGame(storage, catalog);
  assert.equal(restored.game.view, 'first-input'); assert.ok(restored.notice?.includes('变化'));
  assert.ok(!restored.game.first.units.some(u => u.unitId === 'removed-unit'));
});
test('known exceptional board-limit augment does not receive ordinary leveling advice', () => {
  const state = { ...first(), augment1Id: 'DA_SoloLeveling' };
  assert.equal(analyzeGame(state, catalog, now).routes.length, 0);
  assert.match(analyzeGame(state, catalog, now).judgment, /通用运营规则不适用/);
});
