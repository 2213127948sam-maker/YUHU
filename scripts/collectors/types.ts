import type { CompSourceData, MetaSource } from '../../src/types/terminal.ts';
export interface Collection { patch?:string; sourceUpdatedAt?:string; records:CompSourceData[]; fields:string[]; message:string }
export interface Collector { id:MetaSource; url:string; method:string; collect:(set:string,now:string)=>Promise<Collection> }
