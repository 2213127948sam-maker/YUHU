import { mkdir, writeFile } from 'node:fs/promises';
import { load } from 'cheerio';
await mkdir('.cache/source-probes', { recursive:true });
for (const [id,url] of Object.entries({tftacademy:'https://tftacademy.com/tierlist/comps',tftflow:'https://tftflow.com/',tftable:'https://tftable.cc/comps',datatft:'https://www.datatft.com/comps/rank',metatft:'https://www.metatft.com/comps'})) {
 try { const r=await fetch(url,{signal:AbortSignal.timeout(20000)}); const html=await r.text(); await writeFile(`.cache/source-probes/${id}.html`,html); const $=load(html); console.log(id,r.status,html.length,$('title').text()); console.log($('script').map((_,x)=>$(x).attr('src')||$(x).text().slice(0,130)).get()); console.log('patch',html.match(/.{0,50}(?:Patch |patch[": ]+|Ver: )18\.[0-9]+.{0,60}/g)?.slice(0,8)); } catch(e){console.log(id,String(e));}
}
