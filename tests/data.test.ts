import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, mkdtemp, mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import bundleJson from '../src/data/generated/bundle.json';
import compsJson from '../src/data/curated/comps.json';
import { staticSchema, compsSchema } from '../src/data/schema.ts';
import { validateDataset } from '../src/data/validation.ts';
import { getCurrentMetaCandidates } from '../src/engine/recommendationEngine.ts';
import { getDataStatus } from '../src/data/status.ts';
import { compStatus, CuratedMetaProvider } from '../src/dataProviders/meta/index.ts';
import { normalizeCommunityDragon, type RawTft } from '../src/dataProviders/communityDragon.ts';
import { parsePatchLinks, parseOfficialArticle } from '../src/dataProviders/riotPatch.ts';
import { commitBundle, readBundle, recover, atomicJson, writeAttempt, withUpdateLock, readJson } from '../scripts/lib/storage.ts';
import { strategyRules } from '../src/data/curated/strategyRules.ts';
import { augmentStrategyMetadata } from '../src/data/curated/augmentStrategyMetadata.ts';
import type { UpdateAttempt } from '../src/data/types.ts';
const bundle = staticSchema.parse(bundleJson.data[0]), comps = compsSchema.parse(compsJson);
const patch = bundle.patch.data[0], freshNow = Date.parse(bundle.champions.metadata.collectedAt);

test('checked-in datasets and all six route types pass validation', () => {
  assert.deepEqual(validateDataset(bundle, comps, { minimumComps: 15 }).errors, []);
  assert.equal(new Set(comps.map(c => c.archetype)).size, 6);
  assert.ok(bundle.champions.data.every(c => c.id.startsWith('DA_')));
  assert.ok(bundle.augments.data.every(c => c.id.startsWith('DA_')));
  assert.equal(bundle.items.data.filter(i => i.category === 'component').length, 10);
  assert.ok(!bundle.items.data.some(i => /debug|assist|wisp/i.test(i.id)));
  assert.ok(bundle.champions.data.some(c => c.id === 'DA_18_ElderDragon'));
  assert.ok(!bundle.champions.data.some(c => c.id === 'TFT_ElderDragon'));
});
test('validator handles malformed roots, undefined, null and corrupt optional values without throwing', () => {
  for (const input of [undefined, null, {}, [], { champions: undefined }]) assert.equal(validateDataset(input, comps).ok, false);
  for (const value of [NaN, Infinity, -Infinity, -0.1, 1.1, null]) {
    const dirty = structuredClone(comps); (dirty[0].meta as Record<string, unknown>).top4Rate = value;
    assert.equal(validateDataset(bundle, dirty).ok, false);
  }
  const dirty = structuredClone(comps); dirty[0].meta.avgPlacement = 8.1;
  assert.equal(validateDataset(bundle, dirty).ok, false);
  dirty[0].meta.avgPlacement = 4; dirty[0].meta.sampleSize = -1;
  assert.equal(validateDataset(bundle, dirty).ok, false);
});
test('duplicate IDs, costs, dangling traits/units/items/augments and absent roles are rejected', () => {
  for (const mutate of [
    (b: typeof bundle) => b.champions.data.push(b.champions.data[0]),
    (b: typeof bundle) => { b.champions.data[0].cost = 9; },
    (b: typeof bundle) => { b.champions.data[0].traits = ['missing']; },
    (b: typeof bundle) => { b.items.data[0].name = ' '; },
    (b: typeof bundle) => { b.augments.metadata.patch = 'old'; },
  ]) { const dirty = structuredClone(bundle); mutate(dirty); assert.equal(validateDataset(dirty, comps).ok, false); }
  for (const key of ['coreUnits', 'optionalUnits', 'carries', 'tanks', 'preferredAugments'] as const) {
    const dirty = structuredClone(comps); dirty[0][key] = ['missing']; assert.equal(validateDataset(bundle, dirty).ok, false);
  }
  const dirty = structuredClone(comps); dirty[0].preferredItems![0].items = ['missing'];
  assert.equal(validateDataset(bundle, dirty).ok, false);
});
test('patch and Set changes quarantine old Meta without deleting or relabeling it', async () => {
  const next = { ...patch, patch: '18.3' };
  assert.equal(getCurrentMetaCandidates(comps, next, freshNow).length, 0);
  assert.equal((await new CuratedMetaProvider(comps, next).getComps())[0].status, 'stale');
  assert.equal(compStatus(comps[0], { ...patch, set: '19' }), 'stale');
  assert.equal(getCurrentMetaCandidates(comps, patch, freshNow).length, comps.length);
  assert.equal(getCurrentMetaCandidates(comps, patch, freshNow + 96 * 3600000).length, 0);
  const dirty = structuredClone(comps); dirty[0].patch = '18.3';
  assert.match(validateDataset(bundle, dirty, { allowStale: true }).errors.join(), /来源 Patch/);
  const stale = structuredClone(comps); stale.forEach(c => { c.patch = '18.1'; c.meta.sources.forEach(s => s.patch = '18.1'); });
  assert.equal(validateDataset(bundle, stale).ok, false);
  const allowed = validateDataset(bundle, stale, { allowStale: true });
  assert.equal(allowed.ok, true); assert.equal(allowed.staleCompIds.length, stale.length);
});
test('last-known-good survives failed commit and journal recovery', async () => {
  await mkdir('.cache/tests', { recursive: true });
  const directory = await mkdtemp(path.resolve('.cache/tests/store-'));
  await commitBundle(bundle, directory);
  const original = await readFile(path.join(directory, 'generated/bundle.json'), 'utf8');
  const next = structuredClone(bundle); next.champions.metadata.collectedAt = new Date().toISOString();
  await assert.rejects(commitBundle(next, directory, async () => { throw new Error('simulated disk failure'); }), /disk failure/);
  assert.equal(await readFile(path.join(directory, 'generated/bundle.json'), 'utf8'), original);
  const previous = path.join(directory, 'history/interrupted');
  await rename(path.join(directory, 'generated'), previous);
  await atomicJson(path.join(directory, '.transaction.json'), { previous: 'history/interrupted' });
  await recover(directory);
  assert.deepEqual(await readBundle(directory), bundle);
  await writeFile(path.join(directory, 'generated/champions.json'), '{}');
  await assert.rejects(readBundle(directory), /generation/);
});
test('concurrent update lock rejects second writer', async () => {
  const directory = await mkdtemp(path.resolve('.cache/tests/lock-'));
  await withUpdateLock(async () => {
    await assert.rejects(withUpdateLock(async () => undefined, directory), /已有更新任务/);
  }, directory);
});
test('failed provider keeps newer observed patch, status shows error and Meta stale', async () => {
  const directory = await mkdtemp(path.resolve('.cache/tests/status-'));
  const observedPatch = { set: '18', patch: '18.3', checkedAt: new Date().toISOString() };
  await writeAttempt({ success: true, observedPatch, checkedAt: new Date().toISOString() }, directory);
  const file = path.join(directory, 'generated/bundle.json');
  await commitBundle(bundle, directory);
  const original = await readFile(file, 'utf8');
  await writeAttempt({ success: false, provider: 'RiotPatch', error: 'network unavailable', checkedAt: new Date().toISOString() }, directory);
  const attempt = await readJson<UpdateAttempt>(path.join(directory, 'update-status.json'));
  assert.equal(attempt.observedPatch?.patch, '18.3');
  const status = getDataStatus(bundle, comps, attempt, freshNow);
  assert.equal(status.staticStatus, 'error'); assert.equal(status.metaStatus, 'stale');
  assert.equal(await readFile(file, 'utf8'), original);
});
test('official patch parser selects patch links and rejects missing structured evidence', () => {
  const html = '<a href="/en-us/news/game-updates/teamfight-tactics-patch-18-2/">TFT</a><a href="/en-us/news/game-updates/teamfight-tactics-patch-18-10/">TFT</a><a href="https://evil.invalid/news/game-updates/teamfight-tactics-patch-99-1/">fake</a>';
  assert.equal(parsePatchLinks(html)[0].patch, '18.10');
  assert.throws(() => parseOfficialArticle('<p>18.2</p>', '18.2'), /可验证/);
  assert.equal(parseOfficialArticle('<script type="application/ld+json">{"@type":"Article","version":"18.2","datePublished":"2026-09-09T18:00:00Z"}</script>', '18.2').patch, '18.2');
});
test('normalizer refuses unreviewed new Set policies', () => {
  assert.throws(() => normalizeCommunityDragon({} as RawTft, { ...patch, set: '19' }, bundle.champions.metadata,
    { version: '', data: {} }, { version: '', data: {} }), /过滤策略/);
});
test('manual strategy and augment annotations reference real IDs independently of Meta', () => {
  assert.equal(new Set(strategyRules.map(r => r.compId)).size, comps.length);
  for (const c of comps) {
    const rule = strategyRules.find(r => r.compId === c.id);
    assert.ok(rule); assert.equal(rule.defaultRollLevel, c.defaultRollLevel);
    assert.ok(rule.standardLeveling.length); assert.ok(rule.pivotConditions?.length);
  }
  for (const a of augmentStrategyMetadata) assert.ok(bundle.augments.data.some(row => row.id === a.augmentId));
});
test('curated sources have auditable local factual snapshots with matching hashes and metrics', async () => {
  for (const c of comps) for (const source of c.meta.sources) {
    assert.ok(source.snapshot); const contents = await readFile(source.snapshot, 'utf8');
    assert.equal(createHash('sha256').update(contents).digest('hex'), source.sha256);
    const snapshot = JSON.parse(contents);
    assert.equal(snapshot.patch, c.patch); assert.equal(snapshot.set, c.set);
    const rank = Number(c.id.split('-').at(-1));
    const facts = snapshot.compFacts.find((x: { rank: number }) => x.rank === rank);
    assert.ok(facts);
    assert.equal(Number(facts.metrics[0].replace('Avg place', '')), c.meta.avgPlacement);
  }
});
