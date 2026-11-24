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
