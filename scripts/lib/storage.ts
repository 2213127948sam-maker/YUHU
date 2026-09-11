import { mkdir, readFile, rename, open, unlink, access } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { StaticBundle, UpdateAttempt, GeneratedDataset } from '../../src/data/types.ts';
export const ROOT = path.resolve(import.meta.dirname, '../..');
export const DATA_DIR = path.join(ROOT, 'src/data');
export async function readJson<T>(file: string): Promise<T> { return JSON.parse(await readFile(file, 'utf8')) as T; }
export async function exists(file: string): Promise<boolean> {
  try { await access(file); return true; } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return false; throw e; }
}
export async function atomicJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  const handle = await open(temporary, 'wx');
  try { await handle.writeFile(JSON.stringify(value, null, 2) + '\n'); await handle.sync(); } finally { await handle.close(); }
  await rename(temporary, file);
}
export async function readBundle(directory = DATA_DIR): Promise<StaticBundle> {
  const envelope = await readJson<GeneratedDataset<StaticBundle>>(path.join(directory, 'generated/bundle.json'));
  if (envelope.metadata?.schemaVersion !== 1 || envelope.data?.length !== 1) throw new Error('DataStore: generation envelope 无效');
  const bundle = envelope.data[0];
  const files = await Promise.allSettled(Object.keys(bundle).map(async key => {
    const dataset = await readJson(path.join(directory, 'generated', `${key}.json`));
    if (JSON.stringify(dataset) !== JSON.stringify(bundle[key as keyof StaticBundle])) throw new Error(`DataStore: ${key}.json 与当前 generation 不一致`);
  }));
  for (const f of files) if (f.status === 'rejected') throw f.reason;
  return bundle;
}
// Whole-generation directory swap. Journal recovery handles process interruption
// between the two renames; handled errors restore the previous generation.
export async function recover(directory = DATA_DIR) {
  const journal = path.join(directory, '.transaction.json');
  if (!await exists(journal)) return;
  const j = await readJson<{ previous: string }>(journal);
  const previous = path.resolve(directory, j.previous);
  if (!previous.startsWith(path.resolve(directory, 'history') + path.sep)) throw new Error('Invalid recovery path');
  if (!await exists(path.join(directory, 'generated')) && await exists(previous))
    await rename(previous, path.join(directory, 'generated'));
  await unlink(journal);
}
export async function commitBundle(bundle: StaticBundle, directory = DATA_DIR,
  beforePublish?: () => Promise<void>, extra: Record<string, unknown> = {}) {
  await mkdir(directory, { recursive: true });
  await recover(directory);
  const stamp = `${Date.now()}-${randomUUID()}`;
  const staging = path.join(directory, `.staging-${stamp}`), live = path.join(directory, 'generated');
  const previous = path.join(directory, 'history', stamp), journal = path.join(directory, '.transaction.json');
  await mkdir(staging);
  for (const [name, dataset] of Object.entries(bundle)) await atomicJson(path.join(staging, `${name}.json`), dataset);
  for (const [name, dataset] of Object.entries(extra)) {
    if (!/^[a-z][a-z-]*$/.test(name)) throw new Error('Invalid extra dataset name');
    await atomicJson(path.join(staging, `${name}.json`), dataset);
  }
  await atomicJson(path.join(staging, 'bundle.json'), {
    metadata: { ...bundle.champions.metadata, source: 'TFT Assistant validated snapshot (CommunityDragon + Riot)',
      supportingSources: [...new Set(Object.values(bundle).flatMap(d => [d.metadata.sourceUrl, ...d.metadata.supportingSources ?? []]))] },
    data: [bundle],
  });
  await mkdir(path.dirname(previous), { recursive: true });
  const hadPrevious = await exists(live);
  await atomicJson(journal, { previous: path.relative(directory, previous) });
  try {
    if (hadPrevious) await rename(live, previous);
    await beforePublish?.();
    await rename(staging, live);
    await unlink(journal);
  } catch (error) {
    if (!await exists(live) && hadPrevious && await exists(previous)) await rename(previous, live);
    if (await exists(journal)) await unlink(journal);
    throw error;
  }
}
export async function withUpdateLock<T>(task: () => Promise<T>, directory = DATA_DIR): Promise<T> {
  await mkdir(directory, { recursive: true });
  const lock = path.join(directory, '.data-update.lock');
  let handle;
  try { handle = await open(lock, 'wx'); }
  catch { throw new Error('DataStore: 已有更新任务或残留锁；确认没有更新进程后删除 src/data/.data-update.lock 再运行'); }
  await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  try { await recover(directory); return await task(); }
  finally { await handle.close(); await unlink(lock); }
}
export async function writeAttempt(attempt: UpdateAttempt, directory = DATA_DIR) {
  // A later network error must not erase an already observed newer version.
  if (!attempt.observedPatch && await exists(path.join(directory, 'update-status.json'))) {
    const previous = await readJson<UpdateAttempt>(path.join(directory, 'update-status.json'));
    attempt = { ...attempt, observedPatch: previous.observedPatch };
  }
  await atomicJson(path.join(directory, 'update-status.json'), attempt);
}
