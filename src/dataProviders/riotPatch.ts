import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import type { GeneratedDataset, PatchInfo } from '../data/types.ts';
import { fetchDocument, parseJson, ProviderError } from './http.ts';

export const PATCH_FEEDS = [
  'https://teamfighttactics.leagueoflegends.com/en-us/news/',
  'https://teamfighttactics.leagueoflegends.com/en-au/news/tags/patch-notes/',
];
export const RESOURCE_METADATA = 'https://raw.communitydragon.org/latest/content-metadata.json';
export const RIOT_VERSIONS = 'https://ddragon.leagueoflegends.com/api/versions.json';

export function parsePatchLinks(html: string): { patch: string; url: string }[] {
  const $ = load(html);
  const links = new Map<string, string>();
  $('a[href]').each((_, a) => {
    const href = $(a).attr('href')!;
    const match = href.match(/\/news\/game-updates\/teamfight-tactics-patch-(\d+)-(\d+)\/?$/);
    if (!match) return;
    const url = new URL(href, PATCH_FEEDS[0]);
    if (url.hostname !== 'teamfighttactics.leagueoflegends.com') return;
    links.set(`${match[1]}.${match[2]}`, url.href);
  });
  return [...links].map(([patch, url]) => ({ patch, url })).sort((a, b) =>
    b.patch.localeCompare(a.patch, undefined, { numeric: true }));
}

export function parseOfficialArticle(html: string, expectedPatch: string): { releasedAt: string; patch: string } {
  const $ = load(html);
  const objects: Record<string, unknown>[] = [];
  function visit(value: unknown) {
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      objects.push(obj); Object.values(obj).forEach(visit);
    }
  }
  $('script[type="application/ld+json"]').each((_, el) => { visit(JSON.parse($(el).text())); });
  const article = objects.find(o => o.version === expectedPatch && typeof o.datePublished === 'string');
  if (!article || !Number.isFinite(Date.parse(String(article.datePublished))))
    throw new ProviderError('RiotPatch', '官方文章缺少可验证的 version/datePublished，拒绝猜测版本');
  return { releasedAt: String(article.datePublished), patch: expectedPatch };
}

export async function getCurrentPatch(onObserved?: (patch: Pick<PatchInfo, 'set' | 'patch' | 'checkedAt'>) => void): Promise<GeneratedDataset<PatchInfo>> {
  let links: ReturnType<typeof parsePatchLinks> = [];
  let feedUrl = '';
  for (const url of PATCH_FEEDS) {
    try { links = parsePatchLinks((await fetchDocument(url, 'RiotPatch')).text); feedUrl = url; }
    catch (error) { console.warn(String(error)); }
    if (links.length) break;
  }
  if (!links.length) throw new ProviderError('RiotPatch', '官方公告列表没有可识别的版本链接');
  const article = await fetchDocument(links[0].url, 'RiotPatch');
  const official = parseOfficialArticle(article.text, links[0].patch);
  onObserved?.({ set: official.patch.split('.')[0], patch: official.patch, checkedAt: new Date().toISOString() });
  const candidates = await Promise.allSettled([
    fetchDocument(RESOURCE_METADATA, 'CommunityDragon release'),
    fetchDocument(RIOT_VERSIONS, 'Riot DataDragon'),
  ]);
  for (const result of candidates) if (result.status === 'rejected') throw result.reason;
  const [resource, versionsDoc] = candidates.map(r => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof fetchDocument>>>).value);
  const version = parseJson<{ version: string }>(resource, 'CommunityDragon release').version;
  const versions = parseJson<string[]>(versionsDoc, 'Riot DataDragon');
  if (!Array.isArray(versions) || typeof version !== 'string' || !/^\d+\.\d+\.\d+/.test(version))
    throw new ProviderError('RiotPatch', '资源版本结构变化');
  const resourceVersion = versions[0];
  if (version.split('.').slice(0, 2).join('.') !== resourceVersion.split('.').slice(0, 2).join('.'))
    throw new ProviderError('RiotPatch', `CommunityDragon ${version} 与 Riot ${resourceVersion} 尚未同步`);
  const publishedAt = resource.lastModified;
  if (!publishedAt || Date.parse(publishedAt) < Date.parse(official.releasedAt))
    throw new ProviderError('RiotPatch', '资源发布早于最新公告或没有发布时间，拒绝标为当前版本');
  const checkedAt = new Date().toISOString();
  if (Date.parse(official.releasedAt) > Date.now()) throw new ProviderError('RiotPatch', '公告尚未发布');
  // Riot currently uses Set.patch numbering (18.2). The normalizer separately
  // requires a reviewed live-set policy; a numbering/schema change fails closed.
  const set = official.patch.split('.')[0];
  const info: PatchInfo = {
    set, ...official, patchNotesUrl: article.url, checkedAt, resourceVersion,
    resourcePublishedAt: new Date(publishedAt).toISOString(), resourceMetadataUrl: RESOURCE_METADATA,
    patchAssociation: '官方公告版本 + Riot/CDragon 资源分支一致 + 资源发布时间晚于公告；非地区服务器上线探测',
  };
  return { metadata: {
    source: 'Riot Games TFT patch notes', sourceUrl: article.url, set, patch: official.patch,
    collectedAt: checkedAt, schemaVersion: 1, sourceVersion: resourceVersion,
    sha256: createHash('sha256').update(article.text).digest('hex'),
    supportingSources: [feedUrl, RESOURCE_METADATA, RIOT_VERSIONS],
  }, data: [info] };
}
