import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createTargetFilter} from './target-exclusion-model.mjs';
import {addTargetExclusions} from './target-exclusion-build.mjs';
const evidence=JSON.parse(fs.readFileSync('home-care/site/target-assortment-exclusions.json'));
const filter=createTargetFilter({...evidence,requireClearance:false});
test('brand and title aliases exclude all Mrs Meyers packs without mutating records',()=>{
 for(const name of ["Mrs. Meyer’s Clean Day Lemon Dish Soap",'Mrs Meyers Clean Day 3 pack','MRS. MEYER\'S Lavender']){const item={id:name,name,brand:''},saved=JSON.stringify(item);assert.equal(filter.isEligible(item),false);assert.equal(JSON.stringify(item),saved);}
 assert.equal(filter.isEligible({brand:"Mrs. Meyer's",name:'Lemon Verbena'}),false);
 assert.equal(filter.isEligible({coverageBrand:'Method',name:'Dish soap'}),false);
 assert.equal(filter.isEligible({brand:'Great Value',name:'All Purpose Cleaner'}),true);
 assert.equal(filter.isEligible({brand:'Generic',name:'Replacement pad compatible with Swiffer'}),true);
});
test('exact item exclusions retain sibling variants',()=>{
 const f=createTargetFilter({brands:[],items:[{id:'a',url:'https://example.com/a'}]});assert.equal(f.isEligible({id:'a'}),false);assert.equal(f.isEligible({url:'https://example.com/a'}),false);assert.equal(f.isEligible({id:'b'}),true);
});
test('browser policy removes excluded saved IDs, keeps canonical records and filters international registration',()=>{
 const approved=evidence.clearances[0].records[0];
 const items=[{id:'mrs',brand:"Mrs. Meyer's",name:'Soap'},approved,{id:'unreviewed',brand:'Unknown',name:'Soap'}];
 const html=addTargetExclusions('<head></head><script>const ITEMS='+JSON.stringify(items)+';\nconst COVERAGE={};const byId=new Map(ITEMS.map(d=>[d.id,d]));const picks=new Set('+JSON.stringify(['mrs',approved.id,'unreviewed'])+'.filter(id=>byId.has(id)));window.result={canonical:CANONICAL_ITEMS.length,visible:ITEMS.length,selected:[...picks]};</script>references=await response.json();<div class="grid" id="product-grid">','home-care/site');
 const c=vm.createContext({window:{}});for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(m[1],c);
 assert.deepEqual(JSON.parse(JSON.stringify(c.window.result)),{canonical:3,visible:2,selected:[approved.id,'unreviewed']});assert.ok(html.includes('references=(await response.json()).filter(window.HCTargetExclusions.isEligible);'));
});

test('strict mode hides unknown, new and changed records and exclusions always override clearance',()=>{
 assert.equal(evidence.requireClearance,false);
 const f=createTargetFilter({...evidence,requireClearance:true}),item=evidence.clearances[0].records[0];
 assert.equal(f.isEligible(item),true);
 for(const changed of [{...item,id:'new'}, {...item,brand:'Generic'}, {...item,url:'https://example.com'}, {...item,retailer:'Other retailer'}, {...item,name:'Different pack'}, {id:'unknown',name:'Unknown cleaner'}])assert.equal(f.isEligible(changed),false);
 const deny=createTargetFilter({...evidence,items:[{id:item.id}]});assert.equal(deny.isEligible(item),false);
 const conflicting=createTargetFilter({...evidence,brands:[...evidence.brands,{brand:item.brand}]});assert.equal(conflicting.isEligible(item),false);
 assert.equal(createTargetFilter({...evidence,requireClearance:true,clearances:[]}).isEligible(item),false);
});

test('all retailers use the same confirmed-overlap rule without a private-label allowlist',()=>{
 for(const retailer of ['TikTok Shop','Amazon US','Walmart','Costco','Quince','Other']){
  assert.equal(createTargetFilter(evidence).isEligible({retailer,name:'Unreviewed cleaner',brand:'Unreviewed'}),true);
  for(const rule of evidence.brands)assert.equal(createTargetFilter(evidence).isEligible({retailer,name:'Example pack',brand:rule.brand}),false,retailer+' '+rule.brand);
 }
});

test('ACTIVE correction applies every retailer, casing and saved selection without blocking unresolved brands',()=>{
 const audit=JSON.parse(fs.readFileSync('home-care/site/catalog-review/target-overlap-audit-2026-11-25.json'));
 assert.equal(audit.retailers.length,20);
 for(const {retailer} of audit.retailers){
  for(const brand of ['ACTIVE','Active','active'])assert.equal(filter.isEligible({retailer,brand,name:'Washing Machine Cleaner for Pet Owners'}),false);
  assert.equal(filter.isEligible({retailer,name:'ACTIVE Washing Machine Cleaner 6ct',brand:''}),false);
  assert.equal(filter.isEligible({retailer,name:'Unreviewed washing machine cleaner',brand:'Unreviewed brand'}),true);
 }
 for(const item of audit.affectedRecords)assert.equal(filter.isEligible(item),false,item.id);
 const html=addTargetExclusions('<head></head><script>const ITEMS='+JSON.stringify([{id:'active-saved',brand:'ACTIVE',name:'Pet owner variant'},{id:'keep',brand:'Unreviewed brand',name:'Cleaner'}])+';\nconst COVERAGE={};const byId=new Map(ITEMS.map(d=>[d.id,d]));const picks=new Set(["active-saved","keep"].filter(id=>byId.has(id)));window.result={canonical:CANONICAL_ITEMS.length,visible:ITEMS.length,selected:[...picks]};</script><div class="grid" id="product-grid">','home-care/site');
 const c=vm.createContext({window:{}});for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(m[1],c);
 assert.deepEqual(JSON.parse(JSON.stringify(c.window.result)),{canonical:2,visible:1,selected:['keep']});
});

test('26 November queue continuation excludes confirmed brands without false homonym matches',()=>{
 const audit=JSON.parse(fs.readFileSync('home-care/site/catalog-review/target-overlap-audit-2026-11-26.json'));
 assert.equal(audit.canonicalCount,10279);
 assert.equal(audit.retailers.length,20);
 assert.equal(audit.newBrandRules,17);
 assert.equal(audit.newlyExcludedCount,296);
 for(const {retailer} of audit.retailers){
  for(const brand of ['Kikkerland','Granite Gold','WD-40','Hagerty','Chef Craft'])assert.equal(filter.isEligible({retailer,brand,name:brand+' example'}),false,retailer+' '+brand);
  assert.equal(filter.isEligible({retailer,brand:'Viking',name:'Viking cleaning tool'}),true,retailer+' Viking homonym');
  assert.equal(filter.isEligible({retailer,brand:'Harper',name:'Harper broom'}),true,retailer+' Harper homonym');
 }
 for(const item of audit.affectedRecords)assert.equal(filter.isEligible(item),false,item.id);
 assert.ok(audit.remainingVisibleBrandQueue.some(x=>x.brand==='(not recorded)'&&x.count===2061));
});

test('27 November queue continuation excludes seven confirmed brands across every retailer and prunes saved IDs',()=>{
 const audit=JSON.parse(fs.readFileSync('home-care/site/catalog-review/target-overlap-audit-2026-11-27.json'));
 assert.equal(audit.canonicalCount,10279);
 assert.equal(audit.retailers.length,20);
 assert.equal(audit.newBrandRules,7);
 assert.equal(audit.newlyExcludedCount,118);
 assert.equal(audit.visibleAfter,4646);
 for(const {retailer} of audit.retailers){
  for(const brand of ['30 SECONDS','AMMEX','Earth Breeze','Tork','CLR Brands','Little Giant','Shurhold'])assert.equal(filter.isEligible({retailer,brand,name:brand+' example'}),false,retailer+' '+brand);
  assert.equal(filter.isEligible({retailer,brand:'Simple Green',name:'Simple Green cleaner'}),true,retailer+' unresolved Simple Green');
  assert.equal(filter.isEligible({retailer,brand:'Quickie',name:'Quickie mop'}),true,retailer+' unresolved Quickie');
 }
 for(const item of audit.affectedRecords)assert.equal(filter.isEligible(item),false,item.id);
 const html=addTargetExclusions('<head></head><script>const ITEMS='+JSON.stringify([{id:'earth-breeze-saved',brand:'Earth Breeze',name:'Laundry sheets'},{id:'keep',brand:'Unreviewed brand',name:'Cleaner'}])+';\nconst COVERAGE={};const byId=new Map(ITEMS.map(d=>[d.id,d]));const picks=new Set(["earth-breeze-saved","keep"].filter(id=>byId.has(id)));window.result={canonical:CANONICAL_ITEMS.length,visible:ITEMS.length,selected:[...picks]};</script><div class="grid" id="product-grid">','home-care/site');
 const c=vm.createContext({window:{}});for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(m[1],c);
 assert.deepEqual(JSON.parse(JSON.stringify(c.window.result)),{canonical:2,visible:1,selected:['keep']});
 assert.equal(audit.remainingQueue.visibleBrandLabels,687);
 assert.equal(audit.remainingQueue.recordsWithoutUsableBrand,2057);
});
