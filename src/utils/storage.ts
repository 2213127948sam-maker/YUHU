import type { GameCatalog, SavedGame, GameState } from '../types/game.ts';
import { newGame, savedGameSchema } from './gameState.ts';
export const STORAGE_KEY = 'tft-assistant:current-game:v1';
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export function restoreGame(storage: StoragePort, catalog: GameCatalog): { game: SavedGame; notice?: string } {
  const fresh = () => newGame(catalog.currentPatch.set, catalog.currentPatch.patch);
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { game: fresh() };
    const parsed = savedGameSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return { game: fresh(), notice: '旧存档格式无效，已新建当前对局。' };
    const game = parsed.data;
    const unitIds = new Set(catalog.bundle.champions.data.map(c => c.id));
    const augmentIds = new Set(catalog.bundle.augments.data.map(c => c.id));
    const itemIds = new Set(catalog.bundle.items.data.filter(c => c.category === 'component').map(c => c.id));
    const clean = (s: GameState): GameState => ({ ...s,
      augment1Id: s.augment1Id && augmentIds.has(s.augment1Id) ? s.augment1Id : undefined,
      augment2Id: s.augment2Id && augmentIds.has(s.augment2Id) ? s.augment2Id : undefined,
      units: s.units.filter((u, i, arr) => unitIds.has(u.unitId) && arr.findIndex(x => x.unitId === u.unitId) === i)
        .map(u => ({ ...u, starred: u.count < 3 ? 1 : u.count < 9 && u.starred === 3 ? 2 : u.starred })),
      components: Object.fromEntries(Object.entries(s.components).filter(([id]) => itemIds.has(id))),
      contested: s.contestedUnitId && unitIds.has(s.contestedUnitId) ? s.contested : 0,
      contestedUnitId: s.contestedUnitId && unitIds.has(s.contestedUnitId) ? s.contestedUnitId : undefined,
    });
    const first = { ...clean(game.first), stage: 'first' as const };
    const second = game.second ? { ...clean(game.second), augment1Id: first.augment1Id, stage: 'second' as const } : null;
    const changed = JSON.stringify(first) !== JSON.stringify(game.first) || JSON.stringify(second) !== JSON.stringify(game.second)
      || game.set !== catalog.currentPatch.set || game.patch !== catalog.currentPatch.patch;
    const invalidView = game.view.startsWith('second') && !second;
    return { game: { ...game, first, second, set: catalog.currentPatch.set, patch: catalog.currentPatch.patch,
      view: changed || invalidView ? 'first-input' : game.view },
      notice: changed ? '数据版本或选项已变化，保留有效输入，请重新分析。' : '已恢复上次的当前对局。' };
  } catch { return { game: fresh(), notice: '无法读取本机存档，本局仍可使用。' }; }
}
export function persistGame(storage: StoragePort, game: SavedGame): boolean {
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ ...game, savedAt: new Date().toISOString() })); return true; }
  catch { return false; }
}
export function clearGame(storage: StoragePort): boolean {
  try { storage.removeItem(STORAGE_KEY); return true; } catch { return false; }
}
