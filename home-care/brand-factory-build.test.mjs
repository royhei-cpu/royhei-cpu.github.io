import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {addBrandFactories} from './brand-factory-build.mjs';

test('factory provenance stays distinct from ownership, missing brands and similar brand names', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'hc-factories-'));
  try {
    fs.copyFileSync(new URL('./site/brand-factories.json', import.meta.url),path.join(dir,'brand-factories.json'));
    const items = [
      {brand:'Libman',id:'libman',category:'Cleaning Tools'},
      {brand:'Rejoice',id:'rejoice'},
      {brand:'All-Clad',id:'all-clad'},
      {brand:"Member's Mark",id:'private-label'},
      {brand:'',id:'missing'},
      {brand:'',coverageBrand:'Method',id:'cross-listed'},
      {brand:'Febreze',id:'owner-only'},
      {brand:'=1+1<script>',id:'untrusted-label'}
    ];
    const before = structuredClone(items);
    addBrandFactories(items,dir);
    for(let i=0;i<items.length;i++) for(const k of Object.keys(before[i])) assert.deepEqual(items[i][k],before[i][k]);
    assert.match(items[0].factoryName,/Arcola/);
    assert.equal(items[0].skuFactoryName,'Not publicly verified');
    assert.equal(items[1].brandOwnerName,'Not publicly verified','Rejoice cleaner must not inherit unrelated P&G shampoo ownership');
    assert.equal(items[2].brandOwnerName,'Not publicly verified','all detergent must not match All-Clad');
    assert.equal(items[3].factoryName,'Not publicly verified','Retailer private labels do not establish their contract factories');
    assert.equal(items[4].factoryCheckedDate,'','Unresearched records must not acquire a verification date');
    assert.match(items[5].factoryName,/Soapbox/);
    assert.equal(items[5].brand,'');
    assert.equal(items[6].brandOwnerName,'Procter & Gamble');
    assert.equal(items[6].manufacturerName,'Not publicly verified');
    assert.equal(items[6].factoryName,'Not publicly verified');
    const html=fs.readFileSync(path.join(dir,'brand-factories.html'),'utf8');
    assert.ok(html.includes('=1+1&lt;script&gt;'));
    assert.ok(!html.includes('=1+1<script>'));
    assert.ok(fs.readFileSync(path.join(dir,'brand-factory-directory.csv'),'utf8').includes('"\'=1+1<script>"'));
    const directory=JSON.parse(fs.readFileSync(path.join(dir,'brand-factory-directory.json')));
    assert.equal(directory.rows.reduce((n,r)=>n+r.productRecords,0),items.length);
    assert.equal(directory.stats.exactSKUFactoriesVerified,0);
    // Execute the generated directory's actual search/status handler.
    const rows=directory.rows.map(r=>({textContent:Object.values(r).join(' '),dataset:{status:r.factoryVerificationStatus},hidden:false}));
    const search={value:'Arcola',addEventListener(){}};
    const status={value:'all',addEventListener(){}};
    const count={textContent:''};
    const context=vm.createContext({document:{querySelectorAll:()=>rows,getElementById:id=>({'factory-search':search,'factory-status':status,'factory-count':count}[id])}});
    vm.runInContext(html.match(/<script>([\s\S]*?)<\/script>/)[1]+';filterFactories();',context);
    assert.equal(rows.filter(r=>!r.hidden).length,1);
    search.value='';status.value='Factory research pending';vm.runInContext('filterFactories()',context);
    assert.equal(rows.filter(r=>!r.hidden).length,3);
    assert.equal(count.textContent,'3 rows');
  } finally {fs.rmSync(dir,{recursive:true,force:true})}
});
