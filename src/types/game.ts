import type { Archetype, Comp } from '../dataProviders/meta/types.ts';
import type { StaticBundle } from '../data/types.ts';
export type BoardStrength = 'strong' | 'average' | 'weak';
export interface UnitSignal { unitId: string; count: number; starred: 1 | 2 | 3 }
export interface GameState {
  stage: 'first' | 'second'; augment1Id?: string; augment2Id?: string;
  components: Record<string, number>; units: UnitSignal[]; boardStrength: BoardStrength;
  level?: number; gold?: number; hp?: number; contested: 0 | 1 | 2; contestedUnitId?: string;
}
export type GameView = 'first-input' | 'first-results' | 'second-input' | 'second-results';
export interface SavedGame {
  schemaVersion: 1; set: string; patch: string; savedAt: string;
  view: GameView; first: GameState; second: GameState | null;
}
export interface GameCatalog {
  bundle: StaticBundle; comps: Comp[]; currentPatch: { set: string; patch: string };
  staticValid: boolean;
}
export interface ScoreFactor { label: string; delta: number; detail: string }
export interface ScoredRoute {
  comp: Comp; archetype: Archetype; title: string; score: number; factors: ScoreFactor[];
  primaryCarryIds: string[]; primaryCopies: number; damage: 'ad' | 'ap' | 'hybrid';
  contested: 0 | 1 | 2;
}
export interface EconomyAdvice {
  currentAction: string; nextNode: string; rollLevel: number; rollWhen: string; rollBudget: string;
  spendNow: number; goldFloor: number | null;
  leveling: { stage: string; level: number }[]; continueConditions: string[];
  pivotConditions: string[]; observe: string[]; itemPrinciple: string;
}
export interface RecommendedRoute extends ScoredRoute {
  advice: EconomyAdvice; carryNames: string[]; tankNames: string[]; unitNames: Record<string, string>;
}
export interface AnalysisResult {
  judgment: string; economy: 'A' | 'B' | 'C'; lock: '低' | '中' | '高';
  routes: RecommendedRoute[]; notices: string[]; fallbackAction: string;
  excludedCount: number; createdAt: string;
}
