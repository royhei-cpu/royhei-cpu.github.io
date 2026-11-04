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
await build({entryPoints:[path.join(dir,'upgrade.jsx')],bundle:true,packages:'external',platform:'node',format:'esm',outfile:path.join(temp,'app.mjs'),logLevel:'silent'});
const {GlobalListings}=await import(pathToFileURL(path.join(temp,'app.mjs')));await rm(temp,{recursive:true});
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
