import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {addBrandFactories} from './brand-factory-build.mjs';

test('factory provenance stays distinct from ownership, missing brands and similar brand names', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'hc-factories-'));
  try {
    fs.copyFileSync(new URL('./site/brand-factories.json', import.meta.url),path.join(dir,'brand-factories.json'));
    const items = [
      {brand:'Libman',id:'libman',category:'Cleaning Tools',manufacturerSource:'https://example.com/retained-product-evidence'},
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
    assert.match(items[3].brandOwnerName,/Sam’s Club/);
    assert.equal(items[3].factoryName,'Not publicly verified','Retailer private labels do not establish their contract factories');
    assert.equal(items[4].factoryCheckedDate,'','Unresearched records must not acquire a verification date');
    assert.match(items[5].factoryName,/Soapbox/);
    assert.equal(items[5].brand,'');
    assert.equal(items[6].brandOwnerName,'Procter & Gamble');
    assert.equal(items[6].manufacturerName,'Not publicly verified');
    assert.equal(items[6].factoryName,'Not publicly verified');
    const html=fs.readFileSync(path.join(dir,'brand-factories.html'),'utf8');
    assert.match(html,/http-equiv="refresh" content="0;url=\/home-care\/\?view=catalog"/);
    assert.doesNotMatch(html,/factory-search|Brand and factory directory|<table/);
    assert.ok(fs.readFileSync(path.join(dir,'brand-factory-directory.csv'),'utf8').includes('"\'=1+1<script>"'));
    const directory=JSON.parse(fs.readFileSync(path.join(dir,'brand-factory-directory.json')));
    assert.equal(directory.rows.reduce((n,r)=>n+r.productRecords,0),items.length);
    assert.equal(directory.stats.exactSKUFactoriesVerified,0);
  } finally {fs.rmSync(dir,{recursive:true,force:true})}
});

test('brand recovery requires the same listing and a blank brand', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hc-recovery-'));
  try {
    const file = new URL('./site/brand-factories.json', import.meta.url);
    fs.copyFileSync(file, path.join(dir, 'brand-factories.json'));
    const proof = JSON.parse(fs.readFileSync(file)).productBrandIdentifications[0];
    for (const [url, original, expected] of [
      [proof.source, '', proof.brand],
      ['https://example.com/another-product', '', ''],
      [proof.source, 'Later retailer correction', 'Later retailer correction']
    ]) {
      const item = {id: proof.id, url, brand: original};
      addBrandFactories([item], dir);
      assert.equal(item.brand, expected);
      assert.equal(item.brandIdentitySource, expected === proof.brand ? proof.source : undefined);
      assert.equal(item.originalCatalogBrand, expected === proof.brand ? original : undefined);
      assert.equal(item.brandIdentityProductCode, expected === proof.brand ? proof.retailerProductCode : undefined);
      assert.equal(item.skuFactoryName, 'Not publicly verified');
    }
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});
