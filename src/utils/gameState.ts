import { z } from 'zod';
import type { GameState, SavedGame, GameCatalog } from '../types/game.ts';
export const gameStateSchema = z.object({
  stage: z.enum(['first', 'second']), augment1Id: z.string().optional(), augment2Id: z.string().optional(),
  components: z.record(z.string(), z.number().int().min(0).max(9)),
  units: z.array(z.object({ unitId: z.string(), count: z.number().int().min(1).max(9), starred: z.union([z.literal(1), z.literal(2), z.literal(3)]) })).max(74),
  boardStrength: z.enum(['strong', 'average', 'weak']), level: z.number().int().min(2).max(10).optional(),
  gold: z.number().int().min(0).max(999).optional(), hp: z.number().int().min(0).max(100).optional(),
  contested: z.union([z.literal(0), z.literal(1), z.literal(2)]), contestedUnitId: z.string().optional(),
});
export const savedGameSchema = z.object({
  schemaVersion: z.literal(1), set: z.string(), patch: z.string(), savedAt: z.string(),
  view: z.enum(['first-input', 'first-results', 'second-input', 'second-results']),
  first: gameStateSchema, second: gameStateSchema.nullable(),
});
export function newGame(set: string, patch: string): SavedGame {
  return { schemaVersion: 1, set, patch, savedAt: new Date().toISOString(), view: 'first-input',
    first: { stage: 'first', components: {}, units: [], boardStrength: 'average', contested: 0 }, second: null };
}
export function secondStage(first: GameState, contestedUnitId?: string): GameState {
  return { ...structuredClone(first), stage: 'second', level: 6, hp: 80, gold: 40, contested: 0, contestedUnitId };
}
export function clampInteger(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.trunc(value))) : min;
}
export function validateGameInput(state: GameState, catalog: GameCatalog): string[] {
  const parsed = gameStateSchema.safeParse(state);
  if (!parsed.success) return ['输入包含无效数字或格式，请检查后重试。'];
  const errors: string[] = [];
  const augmentIds = new Set(catalog.bundle.augments.data.map(a => a.id));
  if (!state.augment1Id || !augmentIds.has(state.augment1Id)) errors.push('请选择本局的第一个强化符文。');
  if (state.stage === 'second') {
    if (!state.augment2Id || !augmentIds.has(state.augment2Id)) errors.push('请选择第二个强化符文。');
    if (state.augment1Id === state.augment2Id) errors.push('两次强化不能选择同一个条目，请核对。');
    if (state.hp === undefined || state.gold === undefined || state.level === undefined) errors.push('请填完整金币、血量和等级。');
  }
  const unitIds = new Set(catalog.bundle.champions.data.map(c => c.id));
  if (state.units.some(u => !unitIds.has(u.unitId))) errors.push('有英雄不属于当前数据版本，请重新选择。');
  if (new Set(state.units.map(u => u.unitId)).size !== state.units.length) errors.push('英雄条目不能重复。');
  if (state.units.some(u => u.count < (u.starred === 3 ? 9 : u.starred === 2 ? 3 : 1))) errors.push('英雄总张数不能少于星级所需张数。');
  const itemIds = new Set(catalog.bundle.items.data.filter(i => i.category === 'component').map(i => i.id));
  if (Object.keys(state.components).some(id => !itemIds.has(id))) errors.push('有散件不属于当前版本。');
  if (state.contested && (!state.contestedUnitId || !unitIds.has(state.contestedUnitId))) errors.push('请指定正在观察同行的核心英雄。');
  return errors;
}
