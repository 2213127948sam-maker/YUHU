import type { Champion, Trait, Item, Augment, Metadata } from '../data/types';
export type MetaSource = 'datatft'|'tftacademy'|'metatft'|'tftable'|'tftflow';
export type SourceId = MetaSource|'riot'|'communityDragon';
export type Freshness = 'fresh'|'stale'|'unknown'|'error';
export type Archetype = 'reroll1'|'reroll2'|'reroll3'|'fast8'|'fast9'|'tempo'|'unknown';
export interface Provenance { source:string; sourceUrl:string; set:string; patch:string; collectedAt:string; sha256?:string; sourceUpdatedAt?:string; retained?:boolean; retentionReason?:'missing'|'error'|'version' }
export interface SourceStatus { id:SourceId; name:string; sourceUrl:string; detectedPatch?:string; collectedAt?:string; checkedAt:string; status:Freshness; method:string; fields:string[]; message:string; retained?:boolean; sourceUpdatedAt?:string }
export interface CompSourceData extends Provenance { source:MetaSource; sourceRecordId:string; name:string; tier?:string; category?:string; avgPlacement?:number; top4Rate?:number; winRate?:number; playRate?:number; sampleSize?:number; trend?:'up'|'down'|'stable'|'new'; trendDelta?:number; notes:string[]; coreUnits?:string[]; carries?:string[]; tanks?:string[]; archetype?:Archetype }
export interface Comp { id:string; name:string; aliases:string[]; set:string; archetype:Archetype; coreUnits:string[]; carries:string[]; tanks:string[]; traits:string[]; sources:CompSourceData[]; updatedAt:string }
export interface EntityStats extends Provenance { tier?:string; avgPlacement?:number; top4Rate?:number; playRate?:number; sampleSize?:number }
export interface PatchData extends Provenance { releasedAt?:string; officialUrl:string; checkedAt:string; summary?:{buffs:string[];nerfs:string[];systemChanges:string[];otherChanges:string[]}; summaryStatus:string; summaryReviewedAt?:string }
export interface UnifiedTFTData { metadata:{set:string;patch:string;generatedAt:string;schemaVersion:1}; patch:PatchData; sourceStatus:SourceStatus[]; comps:Comp[]; augments:(Augment&{provenance:Provenance;sources:EntityStats[]})[]; items:(Item&{provenance:Provenance;sources:EntityStats[]})[]; champions:(Champion&{provenance:Provenance})[]; traits:(Trait&{provenance:Provenance})[] }
export const provenance = (m:Metadata):Provenance => ({source:m.source,sourceUrl:m.sourceUrl,set:m.set,patch:m.patch,collectedAt:m.collectedAt,sha256:m.sha256});
export const sourceNames:Record<SourceId,string> = {riot:'Riot',communityDragon:'CommunityDragon',datatft:'DataTFT',tftacademy:'TFT Academy',metatft:'MetaTFT',tftable:'TFTable',tftflow:'TFTFlow'};
export const archetypeNames:Record<Archetype,string> = {reroll1:'1费 Reroll',reroll2:'2费 Reroll',reroll3:'3费 Reroll',fast8:'Fast 8',fast9:'Fast 9',tempo:'Tempo',unknown:'类型待确认'};
