import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {renderToStaticMarkup} from 'react-dom/server';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {workshopLibrary,referenceEvidence,benchmarkEvidence,benchmarkCSV,configuredBriefHTML,defaultScenario,conceptMedia,workshopPath} from './workshop-logic.js';
import {build} from 'esbuild';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {catalogRows} from './upgrade-model.js';
const dir=path.dirname(fileURLToPath(import.meta.url)),temp=await mkdtemp(path.join(dir,'.ui-test-'));
await build({entryPoints:[path.join(dir,'upgrade.jsx')],bundle:true,packages:'external',platform:'node',format:'esm',outfile:path.join(temp,'app.mjs'),logLevel:'silent'});
const {GlobalListings}=await import(pathToFileURL(path.join(temp,'app.mjs')));
await build({entryPoints:[path.join(dir,'workshop-ui.jsx')],bundle:true,packages:'external',platform:'node',format:'esm',outfile:path.join(temp,'workshop.mjs'),logLevel:'silent'});
const {WhiteLabelWorkshop}=await import(pathToFileURL(path.join(temp,'workshop.mjs')));
await build({entryPoints:[path.join(dir,'workshop-viewer.js')],bundle:true,packages:'external',platform:'node',format:'esm',outfile:path.join(temp,'viewer.mjs'),logLevel:'silent'});
const {prepareModel}=await import(pathToFileURL(path.join(temp,'viewer.mjs')));await rm(temp,{recursive:true});
const refs=JSON.parse(await readFile(path.join(dir,'../site/global-reference-products.json')));
const text=n=>typeof n==='string'||typeof n==='number'?String(n):(n?.children||[]).map(text).join('');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
test('China deep links render eleven real product cards and selection joins the original comparison set',async()=>{
 const rows=catalogRows([{id:'saved-us',name:'Saved U.S. product',retailer:'Walmart',category:'Laundry Care',url:'https://www.walmart.com/ip/1',displayPrice:'$9.99',checkedDate:'2026-10-27'}],()=>'',refs);
 const picks=new Set(['saved-us']);let compareCount=0,screen;
 const props={rows,picks,initialCountry:'China',toggle:id=>picks.has(id)?picks.delete(id):picks.add(id),compare:()=>compareCount++};
 try{
  await act(async()=>{screen=create(React.createElement(GlobalListings,props));});
  const cards=()=>screen.root.findAllByProps({className:'hc-global-card'});assert.equal(cards().length,11);
  assert.ok(cards().some(c=>text(c).includes('David')));assert.ok(cards().every(c=>c.findByType('img').props.src.includes('/cleantrend-opportunity-hub/')));
  for(const c of cards())assert.ok(c.findAllByType('a').some(a=>text(a)==='Source listing ↗'&&a.props.href.startsWith('https://')));
  const first=cards()[0],id=first.props['data-record-id'];await act(async()=>first.findByType('button').props.onClick());
  await act(async()=>screen.update(React.createElement(GlobalListings,{...props,picks})));
  assert.ok(picks.has('saved-us'));assert.ok(picks.has(id));assert.equal(cards()[0].findByType('button').props['aria-pressed'],true);
  await act(async()=>screen.root.findAllByType('button').find(b=>text(b)==='Compare selected (2)').props.onClick());assert.equal(compareCount,1);
  await act(async()=>screen.root.findByProps({'aria-label':'Global retailer'}).props.onChange({target:{value:'Taobao'}}));assert.equal(cards().length,1);
  await act(async()=>screen.root.findByProps({'aria-label':'Global country'}).props.onChange({target:{value:'Japan'}}));assert.equal(screen.root.findByProps({'aria-label':'Global retailer'}).props.value,'All retailers');assert.ok(cards().length>0);
 }finally{if(screen)await act(async()=>screen.unmount());}
});


test('every concept renders its real reference photos before the proposal and explains why and what changes',()=>{
 const {concepts}=workshopLibrary;
 for(const p of concepts){
  const html=renderToStaticMarkup(React.createElement(WhiteLabelWorkshop,{conceptId:p.id,catalog:[],selected:[],onOpen(){},onCompare(){},setConceptId(){}}));
  assert.ok(html.indexOf('id="wl-real-products"')<html.indexOf('id="wl-development-case"'));
  assert.ok(html.indexOf('id="wl-development-case"')<html.indexOf('id="wl-proposed-design"'));
  assert.ok(html.includes('Why consider white label?'));assert.ok(html.includes('Target assortment check'));
  assert.equal((html.match(/data-benchmark-id=/g)||[]).length,2);
  for(const id of p.benchmarks){const r=benchmarkEvidence(id);if(r.path)assert.ok(html.includes(r.path),id);else assert.ok(html.includes('Product photo unavailable'));}
  assert.ok(html.includes('Saved observed price'));assert.ok(html.includes('Proposed retail target'));
 }
});

test('changing concepts changes national-brand photos, and a failed image displays an honest gap',async()=>{
 let screen;
 const props={catalog:[],selected:[],onOpen(){},onCompare(){},setConceptId(){}};
 try{
  await act(async()=>{screen=create(React.createElement(WhiteLabelWorkshop,{...props,conceptId:'laundry-sorter'}));});
  const cards=()=>screen.root.findAll(n=>n.type==='article'&&n.props['data-benchmark-id']);
  assert.deepEqual(cards().map(n=>n.props['data-benchmark-id']),['jj-tota','brabantia-bo']);
  await act(async()=>cards()[0].findByType('img').props.onError());
  assert.match(text(cards()[0]),/Product photo unavailable/);assert.equal(cards()[0].findAllByType('img').length,0);
  const next=workshopLibrary.concepts.find(p=>!p.benchmarks.includes('jj-tota'));
  await act(async()=>screen.update(React.createElement(WhiteLabelWorkshop,{...props,conceptId:next.id})));
  assert.deepEqual(cards().map(n=>n.props['data-benchmark-id']),next.benchmarks);
  assert.equal(cards().filter(n=>n.findAllByType('img').length).length,next.benchmarks.filter(id=>benchmarkEvidence(id).path).length);
 }finally{if(screen)await act(async()=>screen.unmount());}
});

test('configured briefs and comparison CSV retain photos, match qualifications and separate observed prices from proposals',()=>{
 const parse=line=>[...line.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map(m=>m[1].replaceAll('""','"'));
 for(const p of workshopLibrary.concepts){
  const html=configuredBriefHTML(p,defaultScenario(p),workshopLibrary.palette[0],'https://royhei-cpu.github.io/home-care/workshop-assets/');
  const csv=benchmarkCSV(p),rows=csv.replace(/^\uFEFF/,'').split('\r\n').map(parse);
  assert.equal(rows.length,1+2+p.changes.length);assert.ok(rows.every(r=>r.length===22));
  for(const id of p.benchmarks){const r=benchmarkEvidence(id);if(r.path){assert.ok(html.includes('https://royhei-cpu.github.io'+r.path));assert.ok(csv.includes('https://royhei-cpu.github.io'+r.path));}assert.ok(csv.includes(r.sourceUrl));}
  assert.ok(html.includes('Saved observed price:'));assert.ok(html.includes(p.killCriterion.replaceAll('&','&amp;')));
 }
 const p=workshopLibrary.concepts[0];assert.ok(benchmarkCSV({...p,name:'=HYPERLINK("bad")'}).includes('"\'=HYPERLINK(""bad"")"'));
 assert.ok(referenceEvidence.references['marigold-kitchen'].verificationNote.includes('Medium'));
 assert.equal(benchmarkEvidence('missing-id').match,'unavailable');
});

test('every concept retains two national-brand photos and working detail controls',async()=>{
 let screen;const props={catalog:[],selected:[],onOpen(){},onCompare(){},setConceptId(){}};
 try{
  for(const proposal of workshopLibrary.concepts){
   await act(async()=>{const view=React.createElement(WhiteLabelWorkshop,{...props,conceptId:proposal.id});if(screen)screen.update(view);else screen=create(view);});
   const cards=screen.root.findAllByProps({className:'wl-benchmark-card'});assert.equal(cards.length,2,proposal.id);
   assert.deepEqual(cards.map(c=>c.props['data-benchmark']),proposal.benchmarks);
   for(const card of cards){const id=card.props['data-benchmark'],photo=benchmarkEvidence(id),img=card.findByType('img');assert.equal(img.props.src,photo.path);assert.ok(img.props.alt.length>20);assert.ok(img.props.width>=100);assert.equal(card.findByProps({className:'wl-benchmark-photo'}).props.href,photo.path);assert.ok(text(card).includes(photo.sourceTitle));}
   assert.equal(screen.root.findByProps({id:'wl-real-products'}).findAllByProps({className:'wl-benchmark-card'}).length,2);
   assert.equal(screen.root.findByProps({className:'wl-change-grid'}).findAllByType('article').length,proposal.changes.length);
  }
  await act(async()=>screen.update(React.createElement(WhiteLabelWorkshop,{...props,conceptId:'laundry-sorter'})));
  const clickTab=async id=>act(async()=>screen.root.findByProps({id:'wl-tab-'+id}).props.onClick());
  await clickTab('specs');assert.ok(text(screen.root).includes('520 × 350 × 650 mm'));
  await act(async()=>screen.root.findByProps({'aria-label':'Envelope units'}).props.onChange({target:{value:'in'}}));assert.ok(text(screen.root).includes('20.47 × 13.78 × 25.59 in'));
  await clickTab('cost');await act(async()=>screen.root.findByProps({'aria-label':'Proposed retail USD'}).props.onChange({target:{value:'79'}}));assert.ok(text(screen.root.findByProps({className:'wl-measurements'})).includes('$79.00'));
  await clickTab('validation');assert.ok(text(screen.root).includes('Stop condition:'));
  assert.equal(screen.root.findAllByProps({className:'wl-benchmark-card'}).length,2);
 }finally{if(screen)await act(async()=>screen.unmount());}
});


test('A1 inside, detail and exploded renders work without requiring WebGL, with a matching assembly key',async()=>{
 let screen;const p=workshopLibrary.concepts.find(p=>p.id==='laundry-sorter'),media=conceptMedia(p);
 try{
  await act(async()=>{screen=create(React.createElement(WhiteLabelWorkshop,{conceptId:p.id,catalog:[],selected:[],onOpen(){},onCompare(){},setConceptId(){}}));});
  for(const [label,id] of [['Inside','inside'],['Details','detail'],['Exploded','exploded']]){
   await act(async()=>screen.root.findByProps({'aria-label':'Concept render views'}).findAllByType('button').find(b=>text(b)===label).props.onClick());
   const image=screen.root.findByProps({className:'wl-model-stage'}).findByType('img');assert.equal(image.props.src,media.posters[id]);
  }
  assert.equal(screen.root.findByProps({'aria-label':'Exploded assembly key'}).findAllByType('li').length,4);
  assert.equal(screen.root.findAllByProps({className:'wl-poster-pin'}).length,4);
  assert.equal(screen.root.findAllByProps({className:'wl-enable-3d'}).length,1);
 }finally{if(screen)await act(async()=>screen.unmount());}
});

test('the actual textured GLB keeps complete bag assemblies together, restores views and limits finish changes to PP',async()=>{
 const p=workshopLibrary.concepts.find(p=>p.id==='laundry-sorter'),media=conceptMedia(p),bytes=await readFile(path.join(dir,'../site/workshop-models/laundry-sorter-a1.glb'));
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 assert.ok(json.images.length>=5);assert.ok(json.images.every(i=>Number.isInteger(i.bufferView)));
 assert.ok(json.materials.some(m=>m.name.includes('Canvas')&&m.normalTexture&&m.pbrMetallicRoughness.baseColorTexture));
 const loader=new GLTFLoader();loader.register(()=>({name:'GEOMETRY_ONLY_TEST',loadTexture:()=>Promise.resolve(null)}));
 const {scene}=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const model=prepareModel(scene);
 try{
  assert.deepEqual(model.assemblies.map(a=>a.label),media.assemblies);
  const span=model.bounds().getSize(new THREE.Vector3());assert.ok(Math.abs(span.x-.520)<.003);assert.ok(Math.abs(span.y-.650)<.003);assert.ok(Math.abs(span.z-.350)<.005);
  const bag=model.assemblies[1],origin=bag.object.position.clone(),handle=bag.object.children.find(o=>o.userData.partCode==='HA-13-03'),local=handle.position.clone();
  model.setView('exploded');assert.ok(bag.object.position.clone().sub(origin).distanceTo(bag.offset)<1e-8);assert.ok(handle.position.distanceTo(local)<1e-8);
  const exploded=bag.object.position.clone();model.setView('exploded');assert.ok(bag.object.position.distanceTo(exploded)<1e-8);
  model.setView('inside');assert.equal(model.assemblies.find(a=>a.role==='lid').object.visible,false);assert.ok(bag.object.position.distanceTo(origin)<1e-8);
  model.setView('front');assert.equal(model.assemblies.find(a=>a.role==='lid').object.visible,true);
  const materials=[];scene.traverse(o=>{if(o.isMesh)materials.push(...(Array.isArray(o.material)?o.material:[o.material]));});
  const canvas=materials.find(m=>m.name.includes('Canvas')),before=canvas.color.clone();model.setColor('#b5725c');assert.ok(canvas.color.equals(before));assert.ok(materials.find(m=>m.name.startsWith('HA_body')).color.equals(new THREE.Color('#b5725c')));
 }finally{model.dispose();}
 assert.equal(workshopPath('../bad-path'),'/home-care/workshop/laundry-sorter.html');
});
