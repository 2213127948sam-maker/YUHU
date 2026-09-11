import { compsSchema, staticSchema } from './schema.ts';
import type { StaticBundle } from './types.ts';
import type { Comp } from '../dataProviders/meta/types.ts';
import { compStatus } from '../dataProviders/meta/index.ts';
export interface ValidationResult { ok: boolean; errors: string[]; warnings: string[]; staleCompIds: string[] }
export function validateDataset(input: unknown, compInput: unknown, options: { allowStale?: boolean; minimumComps?: number; currentPatch?: { set: string; patch: string } } = {}): ValidationResult {
  const result: ValidationResult = { ok: false, errors: [], warnings: [], staleCompIds: [] };
  // Recursively reject non-finite numbers even in optional/unknown extension fields.
  function finite(value: unknown, path: string) {
    if (typeof value === 'number' && !Number.isFinite(value)) result.errors.push(`${path}: 非有限数字`);
    if (Array.isArray(value)) value.forEach((v, i) => finite(v, `${path}[${i}]`));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => finite(v, `${path}.${k}`));
  }
  finite(input, 'static'); finite(compInput, 'comps');
  const parsed = staticSchema.safeParse(input), compParsed = compsSchema.safeParse(compInput);
  for (const [label, p] of [['static', parsed], ['comps', compParsed]] as const) {
    if (!p.success) p.error.issues.forEach(e => result.errors.push(`${label}.${e.path.join('.')}: ${e.message}`));
  }
  if (!parsed.success || !compParsed.success) return result;
  const bundle: StaticBundle = parsed.data, comps: Comp[] = compParsed.data;
  const patch = bundle.patch.data[0];
  const current = options.currentPatch ?? patch;
  if (patch.patch !== current.patch || patch.set !== current.set) result.errors.push('static: 缓存版本与最新检测版本不一致');
  function unique(values: string[], path: string) {
    const seen = new Set<string>();
    for (const id of values) { if (seen.has(id)) result.errors.push(`${path}: 重复 ID ${id}`); seen.add(id); }
  }
  for (const [key, ds] of Object.entries(bundle)) {
    if (ds.metadata.patch !== patch.patch || ds.metadata.set !== patch.set)
      result.errors.push(`${key}.metadata: Set/Patch 与 patch.json 不一致`);
    if (ds.metadata.sourceVersion !== patch.resourceVersion) result.errors.push(`${key}: 资源版本不一致`);
    if (Date.parse(ds.metadata.collectedAt) > Date.now() + 60000) result.errors.push(`${key}: 采集日期来自未来`);
    if (key !== 'patch') {
      const data = (ds as StaticBundle['items']).data;
      unique(data.map(c => c.id), key);
      for (const c of data) if (c.id !== c.apiName) result.errors.push(`${key}.${c.id}: ID 与 apiName 不一致`);
    }
  }
  const ids = (key: 'champions' | 'traits' | 'items' | 'augments') => new Set(bundle[key].data.map(v => v.id));
  const championIds = ids('champions'), traitIds = ids('traits'), itemIds = ids('items'), augmentIds = ids('augments');
  function refs(values: string[], valid: Set<string>, path: string) {
    for (const id of values) if (!valid.has(id)) result.errors.push(`${path}: 不存在的引用 ${id}`);
  }
  for (const c of bundle.champions.data) refs(c.traits, traitIds, `champions.${c.id}.traits`);
  unique(comps.map(c => c.id), 'comps');
  if (comps.length < (options.minimumComps ?? 0)) result.errors.push(`comps: 数量 ${comps.length} 小于要求 ${options.minimumComps}`);
  for (const c of comps) {
    if (c.meta.sources.some(s => s.patch !== c.patch)) result.errors.push(`${c.id}: 来源 Patch 与阵容不一致，禁止改标签冒充新版本`);
    if ((c.meta.incompleteBoards ?? 0) > (c.meta.sampleSize ?? Infinity)) result.errors.push(`${c.id}: 不完整棋盘数超过样本数`);
    if (Date.parse(c.meta.collectedAt) > Date.now() + 60000) result.errors.push(`${c.id}: Meta 采集日期来自未来`);
    if (c.meta.sources.some(s => Date.parse(s.collectedAt) > Date.parse(c.meta.collectedAt))) result.errors.push(`${c.id}: 来源采集时间晚于阵容采集时间`);
    if (compStatus(c, current) === 'stale') {
      result.staleCompIds.push(c.id);
      (options.allowStale ? result.warnings : result.errors).push(`${c.id}: stale (${c.set}/${c.patch} → ${current.set}/${current.patch})`);
      // Old-set references belong to archived catalogs, never to the new roster.
      if (options.allowStale) continue;
    }
    unique([...c.coreUnits, ...c.optionalUnits], `${c.id}.units`);
    refs([...c.coreUnits, ...c.optionalUnits, ...c.carries, ...c.tanks], championIds, `${c.id}.units`);
    const board = new Set([...c.coreUnits, ...c.optionalUnits]);
    refs([...c.carries, ...c.tanks], board, `${c.id}.roles`);
    for (const p of c.preferredItems ?? []) { refs([p.unitId], board, `${c.id}.preferredItems.unitId`); refs(p.items, itemIds, `${c.id}.items`); }
    refs(c.preferredAugments ?? [], augmentIds, `${c.id}.augments`);
    const expected: Record<string, number> = { reroll1: 5, reroll2: 6, reroll3: 7, fast8: 8, fast9: 9 };
    if (expected[c.archetype] && expected[c.archetype] !== c.defaultRollLevel) result.errors.push(`${c.id}: 运营类型与默认 D 牌等级不一致`);
  }
  result.ok = result.errors.length === 0; return result;
}
