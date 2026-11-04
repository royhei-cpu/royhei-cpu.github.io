import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {addHomecareUpgrade} from './homecare-upgrade-build.mjs';
import {catalogRows,matchingRows,globalCounts,reorderNavigation,asNativeReference} from './ui-src/upgrade-model.js';
const dir=path.dirname(fileURLToPath(import.meta.url)),site=path.join(dir,'site');
const refs=JSON.parse(fs.readFileSync(path.join(site,'global-reference-products.json')));
const library=JSON.parse(fs.readFileSync(path.join(dir,'ui-src/workshop-data.json')));

test('the existing 10,141 catalog records stay intact and global listings include actual China products',()=>{
 const html=fs.readFileSync(path.join(site,'index.html'),'utf8');const start=html.indexOf('const ITEMS=')+12,end=html.indexOf(';\nconst COVERAGE=',start);
 const items=JSON.parse(html.slice(start,end));const ids=new Set(items.map(p=>p.id));
 for(const p of JSON.parse(fs.readFileSync(path.join(site,'catalog-additions.json'))))if(!ids.has(p.id)){ids.add(p.id);items.push(p);}
 const review=JSON.parse(fs.readFileSync(path.join(site,'catalog-review/index.json')));
 for(const file of review.files)for(const p of JSON.parse(fs.readFileSync(path.join(site,'catalog-review',file))))if(!ids.has(p.id)){ids.add(p.id);items.push(p);}
 assert.equal(items.length,10141);const before=JSON.stringify(items);
 const rows=catalogRows(items,()=>'/home-care/photos/test.jpg',refs);
 assert.equal(JSON.stringify(items),before);assert.ok(items.every(p=>rows.some(r=>r.id===p.id)));
 assert.equal(globalCounts(rows).records,10752);assert.equal(globalCounts(rows).countries,20);
 const china=matchingRows(rows,{country:'China'});assert.equal(china.length,11);assert.equal(china.filter(p=>p.retailer==='JD.com').length,9);
 assert.ok(china.every(p=>p.link.startsWith('https://')));assert.ok(china.every(p=>p.image.startsWith('/cleantrend-opportunity-hub/')));
 assert.equal(matchingRows(rows,{query:'中国'}).length,11);
 assert.equal(matchingRows(rows,{country:'China',retailer:'Taobao'}).length,1);
 for(const p of china){const native=asNativeReference(p);assert.equal(native.id,p.id);assert.equal(native.hasSales,false);assert.equal(native.datePosted,'');}
});

test('the actual index receives the new content and semantic navigation puts Opportunities last',()=>{
 const input=fs.readFileSync(path.join(site,'index.html'),'utf8');const output=addHomecareUpgrade(input,site);
 assert.match(output,/<h1>Homecare<\/h1>/);assert.match(output,/White Label Workshop/);assert.match(output,/See China listings/);
 assert.equal(output.slice(output.indexOf('const ITEMS='),output.indexOf(';\nconst COVERAGE=')),input.slice(input.indexOf('const ITEMS='),input.indexOf(';\nconst COVERAGE=')));
 const nav=output.match(/<nav class="view-nav"[^>]*>([\s\S]*?)<\/nav>/)[1];assert.match(nav, /id="nav-opportunities"[\s\S]*?<\/button>$/);
 assert.equal((output.match(/id="homecare-upgrade-loader"/g)||[]).length,1);assert.equal(addHomecareUpgrade(output,site),output);
 const nodes=['nav-catalog','nav-analysis','nav-opportunities','brand-factories','video-guide','nav-global','nav-workshop','nav-target'].map(id=>({id:id.startsWith('nav-')?id:'',dataset:{navigationId:id.startsWith('nav-')?'':id}}));
 const element={children:nodes,append(node){this.children=this.children.filter(n=>n!==node);this.children.push(node);}};reorderNavigation(element);
 assert.equal(element.children.at(-1).id,'nav-opportunities');assert.ok(element.children.findIndex(n=>n.id==='nav-global')<element.children.findIndex(n=>n.id==='nav-workshop'));
 assert.match(output,/market:'Country \/ market'/);assert.match(output,/referenceCurrency:'Reference currency'/);
});

test('all 36 workshop concepts keep national-brand references, specs, BOM costs and 252 real deliverables',()=>{
 assert.equal(library.concepts.length,36);assert.equal(library.benchmarks.length,50);
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'ui-src/workshop-assets.json')));assert.equal(manifest.files.length,252);
 for(const p of library.concepts){assert.ok(p.parts.length>=5);assert.ok(p.specs.length>=5);assert.equal(p.benchmarks.length,2);for(const id of p.benchmarks)assert.ok(library.benchmarks.some(b=>b.id===id));}
 for(const file of manifest.files){const content=fs.readFileSync(path.join(site,'workshop-assets',path.basename(file.path)));assert.equal(content.length,file.bytes);assert.equal(crypto.createHash('sha256').update(content).digest('hex'),file.sha256,file.path);}
 assert.match(fs.readFileSync(path.join(dir,'ui-src/workshop-ui.jsx'),'utf8'),/\/home-care\/workshop-assets\//);
});

test('all 50 national-brand photographs are shipped locally with intact bytes and source attribution',()=>{
 const photos=JSON.parse(fs.readFileSync(path.join(dir,'ui-src/benchmark-photos.json')));
 assert.deepEqual(Object.keys(photos).sort(),library.benchmarks.map(b=>b.id).sort());
 for(const b of library.benchmarks){const p=photos[b.id];assert.match(p.image,/^\/home-care\/benchmark-photos\/[a-z0-9-]+\.jpg$/);assert.match(p.sourcePage,/^https:\/\//);assert.match(p.sourceImage,/^https:\/\//);assert.ok(p.credit.length>2);assert.equal(p.reviewedAt,'2026-11-04');assert.ok(p.width>=250&&p.height>=250);
  const bytes=fs.readFileSync(path.join(site,'benchmark-photos',path.basename(p.image)));assert.equal(bytes.length,p.bytes);assert.equal(bytes.subarray(0,3).toString('hex'),'ffd8ff');assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),p.sha256,b.id);
 }
});

test('the shipped compiled module matches its authored source and resolves all local chunks',()=>{
 const assetDir=path.join(site,'ui-assets');const m=JSON.parse(fs.readFileSync(path.join(assetDir,'manifest.json')));
 for(const [name,hash] of Object.entries(m.sources)){const content=fs.readFileSync(path.join(dir,'ui-src',name));assert.equal(crypto.createHash('sha256').update(content).digest('hex'),hash,name);}
 assert.ok(fs.existsSync(path.join(assetDir,m.entry)));assert.ok(fs.existsSync(path.join(assetDir,m.stylesheet)));
 const pending=[m.entry],seen=new Set();while(pending.length){const file=pending.pop();if(seen.has(file))continue;seen.add(file);const source=fs.readFileSync(path.join(assetDir,file),'utf8');for(const match of source.matchAll(/(?:from|import\()\s*["']\.\/([^"']+)["']/g)){assert.ok(fs.existsSync(path.join(assetDir,match[1])),match[1]);pending.push(match[1]);}}
 const optimizer=fs.readFileSync(path.join(dir,'optimize-loading.mjs'),'utf8');assert.match(optimizer,/addHomecareUpgrade\(html,path.dirname\(file\)\)/);
 const boot=fs.readFileSync(path.join(dir,'ui-src/upgrade.jsx'),'utf8');assert.match(boot,/Weekly brief, additions and coverage notes/);assert.match(boot,/<AudioControls\/>/);assert.match(boot,/hc-merchant-picks/);
});

test('all 50 national-brand photo references are saved, traceable and dimensioned without changing benchmark pricing',()=>{
 const evidence=JSON.parse(fs.readFileSync(path.join(dir,'ui-src/workshop-reference-evidence.json')));
 assert.equal(Object.keys(evidence.references).length,50);
 for(const b of library.benchmarks){
  const r=evidence.references[b.id];assert.ok(r,b.id);assert.equal(r.id,b.id);assert.match(r.sourceUrl,/^https:\/\//);assert.match(r.imageUrl,/^https:\/\//);assert.equal(r.checkedAt,'2026-11-04');assert.ok(r.verificationNote.length>80);
  assert.match(r.path,/^\/home-care\/workshop-reference-photos\/[a-z0-9-]+\.webp$/);
  const content=fs.readFileSync(path.join(site,r.path.replace('/home-care/','')));assert.equal(content.subarray(0,4).toString(),'RIFF');assert.equal(content.subarray(8,12).toString(),'WEBP');assert.equal(content.length,r.bytes);assert.equal(crypto.createHash('sha256').update(content).digest('hex'),r.sha256,b.id);assert.ok(r.width>=100&&r.height>=100);assert.ok(r.width<=1000&&r.height<=900);
  assert.ok(!('price' in r),'Photo sourcing must not replace the saved price observation');
 }
 assert.equal(evidence.references['brabantia-bo'].match,'range-reference');
 assert.equal(evidence.references['vileda-nitrile'].match,'range-reference');
 assert.equal(evidence.references['bd-dustbuster'].sourceType,'Retailer');
 assert.match(evidence.references['bd-dustbuster'].verificationNote,/unavailable/);
});


test('all workshop pages ship their exact national-brand photos in HTML before JavaScript and keep catalog loading separate',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(site,'ui-assets/manifest.json')));assert.ok(manifest.workshopEntry);
 for(const p of library.concepts){
  const html=fs.readFileSync(path.join(site,'workshop',p.id+'.html'),'utf8');
  assert.ok(html.length<140000);assert.equal((html.match(/data-benchmark-id=/g)||[]).length,2);
  assert.ok(html.indexOf('id="wl-real-products"')<html.indexOf('id="wl-proposed-design"'));
  for(const id of p.benchmarks)assert.ok(html.includes('/home-care/workshop-reference-photos/'+id+'.webp'));
  assert.ok(html.includes(manifest.workshopEntry));assert.ok(!html.includes('const ITEMS='));assert.ok(!html.includes('global-reference-products.json'));
 }
 const boot=fs.readFileSync(path.join(dir,'ui-src/upgrade.jsx'),'utf8');assert.ok(boot.includes("location.replace(workshopPath(params.get('concept'))+'#wl-real-products')"));
});

test('A1 deliverables have intact hashes and all five renders while every A0 development pack remains present',()=>{
 const assets=JSON.parse(fs.readFileSync(path.join(site,'workshop-models/assets.json')));
 assert.equal(assets.files.length,9);
 for(const f of assets.files){const content=fs.readFileSync(path.join(site,f.path.replace('/home-care/','')));assert.equal(content.length,f.bytes);assert.equal(crypto.createHash('sha256').update(content).digest('hex'),f.sha256);}
 for(const view of ['studio','front','inside','detail','exploded'])assert.ok(assets.files.some(f=>f.path.endsWith('-'+view+'.jpg')));
 assert.ok(fs.existsSync(path.join(site,'workshop-assets/laundry-sorter-development-pack.zip')));
});
