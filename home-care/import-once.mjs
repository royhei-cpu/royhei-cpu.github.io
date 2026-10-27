import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const root='home-care/site';
const marker=path.join(root,'migration.json');
try{await fs.access(marker);console.log('Home Care already stored in GitHub; using committed files.');process.exit(0);}catch{}
const origin='https://home-care-merchant-catalog-m9bb9cf7y-roy-hei-7199.vercel.app';
async function get(p){const r=await fetch(origin+p,{signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error(p+' HTTP '+r.status);return Buffer.from(await r.arrayBuffer());}
function rewrite(s){return s.replaceAll('/photos/','/home-care/photos/').replaceAll('/videos/','/home-care/videos/').replaceAll('/downloads/','/home-care/downloads/').replaceAll('href="/opportunities.css"','href="/home-care/opportunities.css"').replaceAll('src="/opportunities.js"','src="/home-care/opportunities.js"').replaceAll('href="/tutorial"','href="/home-care/tutorial.html"').replaceAll('href="/"','href="/home-care/"');}
const html=(await get('/')).toString();
if(!html.includes('const ITEMS=')||!html.includes('Choose competitor')||!html.includes('Browse competitors'))throw Error('Unexpected catalog source');
const photos=[...new Set([...html.matchAll(/\/photos\/[a-zA-Z0-9._-]+/g)].map(m=>m[0]))];
if(photos.length!==6230)throw Error('Unexpected photo count '+photos.length);
await fs.mkdir(root,{recursive:true});
await fs.writeFile(path.join(root,'index.html'),rewrite(html));
const names=['opportunities.js','opportunities.css','tutorial.html'];
for(const name of names)await fs.writeFile(path.join(root,name),rewrite((await get('/'+name)).toString()));
const files=[...photos,'/videos/Home_Care_Catalog_Excel_Tutorial.mp4','/downloads/Home_Care_Catalog_Excel_Tutorial.mp4'];
let next=0,done=0;
const hashes={};
await Promise.all(Array.from({length:16},async()=>{while(next<files.length){const p=files[next++],target=path.join(root,p);await fs.mkdir(path.dirname(target),{recursive:true});const b=await get(p);await fs.writeFile(target,b);hashes[p]=crypto.createHash('sha256').update(b).digest('hex');if(++done%500===0)console.log('Copied '+done+' of '+files.length);}}));
await fs.writeFile(path.join(root,'.nojekyll'),'');
await fs.writeFile(marker,JSON.stringify({migratedAt:new Date().toISOString(),items:6265,photos:photos.length,files:hashes},null,2));
console.log('Imported all Home Care catalog assets for permanent GitHub storage.');
