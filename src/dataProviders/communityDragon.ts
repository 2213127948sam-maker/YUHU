import { createHash } from 'node:crypto';
import type { Augment, Champion, GeneratedDataset, Item, Metadata, PatchInfo, StaticBundle, Trait } from '../data/types.ts';
import { fetchDocument, parseJson, ProviderError, type RemoteDocument } from './http.ts';

export const CDRAGON_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/zh_cn.json';
interface RawEntity {
  apiName: string; name: string; icon?: string; squareIcon?: string; desc?: string;
  cost: number; traits: string[]; tags: string[]; isAugment?: boolean;
  effects?: Record<string, unknown>; associatedTraits?: string[];
}
export interface RawTft {
  setData: { number: number; mutator: string; champions: RawEntity[]; traits: RawEntity[]; items: string[]; augments: string[] }[];
  items: RawEntity[];
}
interface RiotCatalog { version: string; data: Record<string, { id: string; image: { full: string }; cost?: number }> }

// Reviewed Set 18 migration policy: live objects are DA_*, while legacy TFT_*
// duplicates, reward proxies and Wisps remain in the same raw item list.
// Never carry this assumption silently into another Set.
export function normalizeCommunityDragon(raw: RawTft, patch: PatchInfo, metadata: Metadata,
  riotChampions: RiotCatalog, riotItems: RiotCatalog): Omit<StaticBundle, 'patch'> {
  if (patch.set !== '18') throw new ProviderError('CommunityDragon', `Set ${patch.set} 尚无经过验证的过滤策略，需要审核新赛季数据结构`);
  if (!Array.isArray(raw.setData) || !Array.isArray(raw.items)) throw new ProviderError('CommunityDragon', '根结构错误');
  const matches = raw.setData.filter(s => String(s.number) === patch.set && s.mutator === `TFTSet${patch.set}`);
  if (matches.length !== 1) throw new ProviderError('CommunityDragon', '无法唯一确定正式 Set');
  const set = matches[0];
  const riotC = new Map(Object.values(riotChampions.data).map(c => [c.id, c]));
  const riotI = new Map(Object.values(riotItems.data).map(i => [i.id, i]));
  // Riot's champion catalog omits the ten playable Riftbeasts. They are
  // explicitly listed in the official Set overview, not ordinary PvE mobs.
  const riftbeasts = new Set(['DA_Gromp18_AP', 'DA_Murkwolf18', 'DA_18_Sentry', 'DA_Cinderling18',
    'DA_Scuttlecrab18', 'DA_Krug18', 'DA_Sentinel18', 'DA_Brambleback18', 'DA_18_ElderDragon', 'DA_CrimsonRaptor18']);
  const icon = (path?: string) => path && path !== 'None'
    ? `https://raw.communitydragon.org/${patch.resourceVersion.split('.').slice(0, 2).join('.')}/game/${path.toLowerCase().replace(/\.tex$/, '.png')}` : undefined;
  const text = (value?: string) => value?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const name = (r: RawEntity) => {
    const result = text(r.name);
    if (!result || result === 'null' || /^(TFT|DA)_/.test(result)) throw new ProviderError('CommunityDragon', `${r.apiName} 缺少本地化名称`);
    return result;
  };
  const traits: Trait[] = set.traits.filter(t => t.apiName.startsWith('DA_')).map(t => ({
    id: t.apiName, apiName: t.apiName, name: name(t), description: text(t.desc), icon: icon(t.icon),
  }));
  const traitNames = new Map(traits.map(t => [t.name, t.id]));
  const champions: Champion[] = set.champions.filter(c => c.apiName.startsWith('DA_') &&
    c.traits.length > 0 && Number.isInteger(c.cost) && c.cost >= 1 && c.cost <= 5 && (riotC.has(c.apiName) || riftbeasts.has(c.apiName))).map(c => ({
    id: c.apiName, apiName: c.apiName, name: name(c), cost: c.cost,
    traits: c.traits.map(t => {
      const id = traitNames.get(t); if (!id) throw new ProviderError('CommunityDragon', `${c.apiName} 羁绊无法解析: ${t}`); return id;
    }),
    icon: riotC.has(c.apiName) ? `https://ddragon.leagueoflegends.com/cdn/${patch.resourceVersion}/img/tft-champion/${riotC.get(c.apiName)!.image.full}` : icon(c.squareIcon),
  }));
  const itemIds = new Set(set.items), augmentIds = new Set(set.augments);
  const live = (r: RawEntity) => r.apiName.startsWith('DA_') && !/debug|test|placeholder|disabled/i.test(r.apiName);
  function category(r: RawEntity): string | undefined {
    if (r.tags.includes('{5b609ae2}')) return undefined; // Wisp, not equipment.
    if (r.tags.includes('component')) return 'component';
    if (/Emblem/.test(r.apiName)) return 'emblem';
    if (/Artifact/.test(r.apiName)) return 'artifact';
    if (/Radiant/.test(r.apiName) && r.tags.includes('{6ef5c598}')) return 'radiant';
    if (r.tags.includes('{7ea41d13}')) return 'completed';
    if (/^DA_Tacticians/.test(r.apiName)) return 'tactician';
    if (r.tags.includes('Consumable') || /Potion18/.test(r.apiName)) return 'consumable';
    return undefined;
  }
  const items: Item[] = raw.items.filter(r => itemIds.has(r.apiName) && live(r) && !r.isAugment &&
    riotI.has(r.apiName) && category(r)).map(r => ({
    id: r.apiName, apiName: r.apiName, name: name(r), description: text(r.desc), category: category(r),
    effects: Object.fromEntries(Object.entries(r.effects ?? {}).filter((e): e is [string, number] => typeof e[1] === 'number' && Number.isFinite(e[1]))),
    icon: `https://ddragon.leagueoflegends.com/cdn/${patch.resourceVersion}/img/tft-item/${riotI.get(r.apiName)!.image.full}`,
  }));
  const tiers: Record<string, string> = { '{d11fd6d5}': 'silver', '{ce1fd21c}': 'gold', '{cf1fd3af}': 'prismatic' };
  const augments: Augment[] = raw.items.filter(r => augmentIds.has(r.apiName) && live(r) && r.isAugment === true).map(r => ({
    id: r.apiName, apiName: r.apiName, name: name(r), description: text(r.desc), icon: icon(r.icon),
    tier: r.tags.map(t => tiers[t]).find(Boolean),
  }));
  // Missing references must not silently shrink a dataset to an apparently valid subset.
  const candidateChampions = set.champions.filter(c => live(c) && c.traits.length && c.cost >= 1 && c.cost <= 5);
  if (candidateChampions.length !== champions.length) throw new ProviderError('CommunityDragon', '部分正式英雄未同步到 Riot 目录');
  const candidateItems = raw.items.filter(r => itemIds.has(r.apiName) && live(r) && !r.isAugment && category(r));
  if (candidateItems.length !== items.length) throw new ProviderError('CommunityDragon', '部分正式装备未同步到 Riot 目录');
  const dataset = <T extends { id: string }>(data: T[]): GeneratedDataset<T> => ({ metadata, data: data.sort((a, b) => a.id.localeCompare(b.id)) });
  return { champions: dataset(champions), traits: dataset(traits), items: dataset(items), augments: dataset(augments) };
}

export async function getStaticData(patch: PatchInfo): Promise<Omit<StaticBundle, 'patch'>> {
  const base = `https://ddragon.leagueoflegends.com/cdn/${patch.resourceVersion}/data/zh_CN/`;
  const requests = await Promise.allSettled([
    fetchDocument(CDRAGON_URL, 'CommunityDragon'),
    fetchDocument(`${base}tft-champion.json`, 'Riot champion catalog'),
    fetchDocument(`${base}tft-item.json`, 'Riot item catalog'),
  ]);
  for (const result of requests) if (result.status === 'rejected') throw result.reason;
  const [raw, champions, items] = requests.map(r => (r as PromiseFulfilledResult<RemoteDocument>).value);
  if (!raw.lastModified || Date.parse(raw.lastModified) < Date.parse(patch.releasedAt!))
    throw new ProviderError('CommunityDragon', '静态数据尚未同步到公告发布时间，保留上一份有效数据');
  const metadata: Metadata = {
    source: 'CommunityDragon TFT zh_cn / Riot DataDragon cross-check', sourceUrl: CDRAGON_URL,
    set: patch.set, patch: patch.patch, collectedAt: new Date().toISOString(), schemaVersion: 1,
    sourceVersion: patch.resourceVersion, sha256: createHash('sha256').update(raw.text).digest('hex'),
    lastModified: raw.lastModified, supportingSources: [champions.url, items.url,
      'https://teamfighttactics.leagueoflegends.com/en-sg/news/game-updates/enchanted-wilds-overview/'],
  };
  return normalizeCommunityDragon(parseJson(raw, 'CommunityDragon'), patch, metadata,
    parseJson(champions, 'Riot champion catalog'), parseJson(items, 'Riot item catalog'));
}
