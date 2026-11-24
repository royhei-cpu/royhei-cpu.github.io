import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createTargetFilter} from './target-exclusion-model.mjs';
import {addTargetExclusions} from './target-exclusion-build.mjs';
const evidence=JSON.parse(fs.readFileSync('home-care/site/target-assortment-exclusions.json'));
const filter=createTargetFilter(evidence);
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
 const items=[{id:'mrs',brand:"Mrs. Meyer's",name:'Soap'},{id:'gv',brand:'Great Value',name:'Soap'}];
 const html=addTargetExclusions('<head></head><script>const ITEMS='+JSON.stringify(items)+';\nconst COVERAGE={};const byId=new Map(ITEMS.map(d=>[d.id,d]));const picks=new Set(["mrs","gv"].filter(id=>byId.has(id)));window.result={canonical:CANONICAL_ITEMS.length,visible:ITEMS.length,selected:[...picks]};</script>references=await response.json();<div class="grid" id="product-grid">','home-care/site');
 const c=vm.createContext({window:{}});for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))vm.runInContext(m[1],c);
 assert.deepEqual(JSON.parse(JSON.stringify(c.window.result)),{canonical:2,visible:1,selected:['gv']});assert.ok(html.includes('references=(await response.json()).filter(window.HCTargetExclusions.isEligible);'));
});
