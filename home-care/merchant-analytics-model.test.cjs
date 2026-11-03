const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('./site/merchant-analytics-model.js');

function item(id, extra = {}) {
  return {
    id:String(id),name:'Product '+id,retailer:'Amazon US',merchantScope:'Home Care',category:'Cleaning Tools',categoryLabel:'Cleaning Tools',
    url:'https://www.amazon.com/dp/B'+String(id).padStart(9,'0'),checkedDate:'2026-11-01',
    displayPrice:'$5.99',priceBasis:'Displayed retailer offer snapshot',hasSales:false,...extra
  };
}
function sale(id, extra = {}) {
  const row=item(id,{hasSales:true,displaySales:'1K+ bought in past month',salesPeriod:'Past month',metricDate:'2026-11-01',salesEvidenceKind:'Retailer purchase badge',...extra});
  row.metricSource=row.metricSource||row.url;return row;
}

test('analysis filters apply retailer, category and default Home Care scope together',()=>{
  const rows=[item(1),item(2,{retailer:'Walmart'}),item(3,{category:'Air Care'}),item(4,{merchantScope:'Home / adjacent references'})];
  assert.deepEqual(model.filterItems(rows).map(d=>d.id),['1','2','3']);
  assert.deepEqual(model.filterItems(rows,{retailer:'Amazon US',category:'Cleaning Tools'}).map(d=>d.id),['1']);
  assert.equal(model.filterItems(rows,{scope:'all'}).length,4);
  assert.equal(model.filterItems(rows,{retailer:'Missing retailer'}).length,0);
});

test('coverage and availability reconcile to captured records and update when new records arrive',()=>{
  const rows=[sale(1),item(2,{category:'Air Care'})];
  let result=model.summarize(rows);
  assert.equal(result.totals.records,2);
  assert.equal(result.categoryBars.reduce((n,b)=>n+b.count,0),2);
  assert.equal(result.retailerBars.reduce((n,b)=>n+b.count,0),2);
  assert.equal(result.availability.withoutCount,1);
  rows.push(sale(3));result=model.summarize(rows);
  assert.equal(result.totals.records,3);
  assert.equal(result.totals.publishedCounts,2);
  assert.equal(result.categoryBars[0].count,2);
  assert.equal(Object.values(result.availability).reduce((a,b)=>a+b,0),3);
});

test('price parser accepts one fixed USD amount with source and date, including one decimal',()=>{
  for(const [displayPrice,value] of [['$4.0',4],['$40.00',40],['USD 12.50',12.5],['US$1,200',1200]]) {
    const price=model.parsePrice(item(1,{displayPrice}));assert.equal(price.eligible,true);assert.equal(price.value,value);
  }
  assert.equal(model.parsePrice(item(1,{displayPrice:''})),null);
});

test('ranges, foreign currency, per-unit and conditional prices are excluded rather than coerced',()=>{
  for(const displayPrice of ['$5–$10','From $5','$5 with coupon','$0','€5','$5.99 / oz']) assert.equal(model.parsePrice(item(1,{displayPrice})).eligible,false,displayPrice);
  assert.equal(model.parsePrice(item(1,{currency:'CAD'})).eligible,false);
  for(const priceBasis of ['Unit price per oz','Member-only price','Price after coupon','Subscribe & Save price','Price not established in this review']) {
    assert.equal(model.parsePrice(item(1,{priceBasis})).eligible,false,priceBasis);
  }
  assert.equal(model.parsePrice(item(1,{priceBasis:'Retailer snapshot; membership and promotions may change price'})).eligible,true);
});

test('sub-dollar records stay in the catalogue but require price basis checks for graphs',()=>{
  const row=item(1,{displayPrice:'$0.05'});
  const price=model.parsePrice(row);assert.equal(price.value,0.05);assert.equal(price.reasonCode,'packCheck');assert.equal(price.eligible,false);
  const result=model.summarize([row]);assert.equal(result.totals.records,1);assert.equal(result.prices.excludedCount,1);assert.equal(result.prices.includedCount,0);
  assert.equal(row.displayPrice,'$0.05');
});

test('price source and check date cannot be inferred from unrelated sales observations',()=>{
  assert.equal(model.parsePrice(item(1,{checkedDate:'',metricDate:'2026-11-01'})).eligible,false);
  assert.equal(model.parsePrice(item(1,{checkedDate:'2026-02-30'})).eligible,false);
  assert.equal(model.parsePrice(item(1,{url:'javascript:alert(1)'})).eligible,false);
  const valid=model.parsePrice(item(1,{priceSource:'https://www.example.com/products/1',checkedDate:'2026-11-01'}));
  assert.equal(valid.sourceUrl,'https://www.example.com/products/1');assert.equal(valid.checkedAt,'2026-11-01');
});

test('price band boundaries and exclusion totals reconcile to the filtered sample',()=>{
  const prices=['$1','$4.99','$5','$10','$20','$30','$50','$0.50','','$5–$10'];
  const result=model.priceBands(prices.map((displayPrice,i)=>item(i+1,{displayPrice})));
  assert.deepEqual(result.bands.map(b=>b.count),[2,1,1,1,1,1]);
  assert.equal(result.includedCount,7);assert.equal(result.excludedCount,2);assert.equal(result.missingCount,1);
  assert.equal(result.includedCount+result.excludedCount+result.missingCount,prices.length);
});

test('sales charts retain separate periods and dates and never synthesize revenue or growth',()=>{
  const result=model.summarize([sale(1),sale(2,{displaySales:'900 bought in past week',salesPeriod:'Past week'}),sale(3,{metricDate:'2026-10-27'})]);
  assert.equal(result.groups.length,3);assert.equal(result.totals.rankedListings,3);
  assert.equal(result.dates.sales.first,'2026-10-27');assert.equal(result.dates.sales.last,'2026-11-01');
  assert.equal(Object.hasOwn(result,'revenue'),false);assert.equal(Object.hasOwn(result,'growth'),false);assert.equal(Object.hasOwn(result,'unitsSoldTotal'),false);
});

test('duplicate count snapshots are preserved in total records but only the latest appears in sales charts',()=>{
  const older=sale(1,{id:'old',metricDate:'2026-10-27'}),newer=sale(1,{id:'new'});
  const result=model.summarize([older,newer]);assert.equal(result.totals.records,2);assert.equal(result.totals.publishedCounts,2);
  assert.equal(result.totals.rankedListings,1);assert.equal(result.availability.otherCountRecords,1);
});

test('empty selections produce empty data and model computation never mutates source records',()=>{
  const rows=[sale(1),item(2)];const copy=JSON.parse(JSON.stringify(rows));
  const result=model.summarize(rows,{category:'Unknown category'});
  assert.equal(result.totals.records,0);assert.equal(result.groups.length,0);assert.equal(result.prices.bands.every(b=>b.count===0),true);
  model.summarize(rows);assert.deepEqual(rows,copy);
});
