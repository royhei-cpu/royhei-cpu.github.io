import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {build} from 'esbuild';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {catalogRows} from './upgrade-model.js';
const dir=path.dirname(fileURLToPath(import.meta.url)),temp=await mkdtemp(path.join(dir,'.ui-test-'));
await build({entryPoints:{app:path.join(dir,'upgrade.jsx'),workshop:path.join(dir,'workshop-ui.jsx')},bundle:true,packages:'external',platform:'node',format:'esm',outdir:temp,outExtension:{'.js':'.mjs'},logLevel:'silent'});
const {GlobalListings}=await import(pathToFileURL(path.join(temp,'app.mjs')));
const {WhiteLabelWorkshop}=await import(pathToFileURL(path.join(temp,'workshop.mjs')));await rm(temp,{recursive:true});
const {workshopLibrary,benchmarkPhotos,defaultScenario,configuredBriefHTML}=await import('./workshop-logic.js');
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

test('every concept displays two matched national-brand photographs beside the concept and retains working detail controls',async()=>{
 let screen;const props={catalog:[],selected:[],onOpen(){},onCompare(){},setConceptId(){}};
 try{
  for(const proposal of workshopLibrary.concepts){
   await act(async()=>{const view=React.createElement(WhiteLabelWorkshop,{...props,conceptId:proposal.id});if(screen)screen.update(view);else screen=create(view);});
   const cards=screen.root.findAllByProps({className:'wl-benchmark-card'});assert.equal(cards.length,2,proposal.id);
   assert.deepEqual(cards.map(c=>c.props['data-benchmark']),proposal.benchmarks);
   for(const card of cards){const id=card.props['data-benchmark'],photo=benchmarkPhotos[id],img=card.findByType('img');assert.equal(img.props.src,photo.image);assert.ok(img.props.alt.length>20);assert.ok(img.props.width>=250);assert.equal(card.findByProps({className:'wl-benchmark-photo'}).props.href,photo.image);assert.ok(text(card).includes(photo.credit));}
   const layout=screen.root.findByProps({className:'wl-product-layout'});assert.equal(layout.findAllByProps({className:'wl-benchmark-card'}).length,2);
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

test('saved configured briefs include the two exact benchmark photos, credits and source links for every concept',()=>{
 for(const p of workshopLibrary.concepts){const html=configuredBriefHTML(p,defaultScenario(p),workshopLibrary.palette[0],'https://royhei-cpu.github.io/home-care/workshop-assets/');
  for(const id of p.benchmarks){const photo=benchmarkPhotos[id];assert.ok(html.includes('https://royhei-cpu.github.io'+photo.image),p.id);assert.ok(html.includes(photo.sourcePage.replaceAll('&','&amp;')));assert.ok(html.includes(photo.credit.replaceAll('&','&amp;')));}
 }
});
