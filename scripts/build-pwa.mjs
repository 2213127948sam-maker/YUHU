import { readFile,writeFile,readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const root=path.resolve('dist');
async function walk(dir){const paths=[];for(const e of await readdir(dir,{withFileTypes:true})){const full=path.join(dir,e.name);if(e.isDirectory())paths.push(...await walk(full));else paths.push(path.relative(root,full).replaceAll('\\','/'));}return paths;}
const assets=(await walk(root)).filter(p=>p!=='sw.js');
const hash=createHash('sha256');for(const file of assets.sort())hash.update(await readFile(path.join(root,file)));
const version=hash.digest('hex').slice(0,16);
const template=await readFile('scripts/pwa/service-worker.template.js','utf8');
await writeFile(path.join(root,'sw.js'),template.replace('__CACHE_NAME__',`tft-data-${version}`).replace('__PRECACHE__',JSON.stringify(assets)));
console.log(`PWA: ${assets.length} local files precached; version ${version}`);
