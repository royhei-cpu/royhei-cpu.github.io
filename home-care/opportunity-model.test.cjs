'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const model = require('./site/opportunity-model.js');

const item = (name,category,extra={}) => ({id:'fixture',name,category,retailer:'Amazon US',merchantScope:'Home Care',...extra});
const opportunity = (items,id,options) => model.analyze(items,options).opportunities.find(o=>o.id===id);
const sourceItem = (id,extra={}) => item('Fragrance Free Laundry Detergent','Laundry Care',{
  id,url:'https://www.amazon.com/dp/B012345678',checkedDate:'2026-11-02',
  hasSales:true,displaySales:'1K+ bought in past month',salesPeriod:'Past month',
  metricDate:'2026-11-01',metricSource:'https://www.amazon.com/dp/B012345678',...extra
});

test('retains the seven existing directions, order, priorities and explicit seeds',()=>{
  assert.deepEqual(model.definitions.slice(0,7).map(d=>d.title),[
    'Electric Cleaning Tools','Sustainable Cleaning','Food Storage','Air Care Premiumization',
    'Pet Odor Control','Pest Control','Home Organization'
  ]);
  assert.deepEqual(model.definitions.slice(0,7).map(d=>d.priority),['High','High','High','High','High','Medium','Medium']);
  assert.equal(model.definitions.length,18);
  assert.ok(model.definitions.slice(0,7).every(d=>d.seedIds.length&&d.original));
  assert.ok(model.definitions.slice(7).every(d=>d.priority==='Explore'&&!d.original));
  assert.ok(model.definitions.every(d=>d.gapLabel.includes('not established')));
});

test('matches product format and category, without substring or generic-claim shortcuts',()=>{
  const cases = [
    ['electric-cleaning','Rechargeable electric scrubber with 6 heads','Cleaning Tools',true],
    ['electric-cleaning','Battery powered LED light','Cleaning Tools',false],
    ['sustainable-formats','Natural eco-friendly all purpose cleaner','Naturals',false],
    ['sustainable-formats','Reusable Swedish dishcloths','Cleaning Tools',true],
    ['sustainable-formats','Concentrated cleaning refill tablets','Naturals',true],
    ['pest-formats','Replacement hanging strap','Pest Control',false],
    ['pest-formats','Flying insect trap refill cards','Pest Control',true],
    ['home-organization','Laundry detergent refill','Laundry Care',false],
    ['home-organization','Collapsible laundry basket','Laundry Care',true],
    ['fragrance-free','Scratch-free surface cleaner','Surface Cleaners',false],
    ['fragrance-free','BPA-free cleaning spray bottle','Surface Cleaners',false],
    ['fragrance-free','Unscented tall kitchen trash bags','Trash Bags',false],
    ['fragrance-free','Free & Clear dish liquid','Dishwashing',true],
    ['fragrance-free','No added fragrance laundry liquid','Laundry Care',true],
    ['laundry-stains','Liquid laundry detergent - stain remover for clothes','Laundry Care',false],
    ['laundry-stains','Laundry stain pretreatment spray','Laundry Care',true],
    ['laundry-stains','Fabric stain remover pen','Specialty Cleaners',true],
    ['laundry-stains','Exterior concrete rust stain remover','Specialty Cleaners',false],
    ['machine-maintenance','Dishwasher detergent tablets','Dishwashing',false],
    ['machine-maintenance','Dishwasher cleaning tablets detergent pods','Dishwashing',false],
    ['machine-maintenance','Tablet Trio Kit, Toilet Bowl Cleaner, Dishwasher & Laundry Detergent Tablets','Naturals',false],
    ['machine-maintenance','Affresh washing machine cleaner tablets','Laundry Care',true],
    ['machine-maintenance','Dishwasher descaler','Specialty Cleaners',true],
    ['pet-odor','Pet-safe multi-surface cleaner','Surface Cleaners',false],
    ['pet-odor','Universal Cleaner, Safe for Family & Pet, Tough on Messes','Surface Cleaners',false],
    ['pet-odor','Pet stain and odor remover','Floor & Carpet Care',true],
    ['hard-water','Hard water bottle with carrying strap','Specialty Cleaners',false],
    ['hard-water','Calcium lime and rust remover','Bathroom & Toilet Cleaning',true],
    ['drain-disposal','Dish drainer drying rack','Dishwashing',false],
    ['drain-disposal','Disposable paper plates','Dishwashing',false],
    ['drain-disposal','Drain clog remover','Specialty Cleaners',true],
    ['drain-disposal','Garbage disposal freshener tablets','Dishwashing',true],
    ['reach-detail','Long handle storage basket','Cleaning Tools',false],
    ['reach-detail','Extendable grout cleaning brush','Cleaning Tools',true],
    ['dish-refills','Dishwasher cleaner refill tablets','Dishwashing',false],
    ['dish-refills','Dish soap refill 90 fl oz','Dishwashing',true],
    ['paper-portions','Select-A-Size paper towels','Paper Towels',true],
    ['paper-portions','Select-A-Size shop storage bags','Food Wrap & Storage',false],
    ['fiber-tabletop','Reusable silicone food storage containers','Disposable Tabletop',false],
    ['fiber-tabletop','Sugarcane fiber bowls 50 count','Disposable Tabletop',true],
    ['toilet-wand','Toilet cleaner liquid refill','Bathroom & Toilet Cleaning',false],
    ['toilet-wand','ToiletWand replacement heads','Bathroom & Toilet Cleaning',true]
  ];
  for(const [id,name,category,expected]of cases) assert.equal(model.match(item(name,category),id),expected,id+': '+name);
});

test('keeps a retained seed but labels it when the format is not established by its title',()=>{
  const seed = item('Natural all purpose cleaner','Naturals',{id:'HC-5d99955edcf6',url:'https://www.dollargeneral.com/p/cleaner/123456',retailer:'Dollar General'});
  const result = opportunity([seed],'sustainable-formats');
  assert.equal(result.counts.distinctListings,1);
  assert.equal(result.counts.titleMatched,0);
  assert.equal(result.counts.retainedSeedOnly,1);
  assert.equal(result.references[0].isSeed,true);
  assert.match(result.references[0].matchBasis,/needs confirmation/);
});

test('deduplicates exact retailer offers and keeps the latest sales cohort without summing snapshots',()=>{
  const older = sourceItem('old',{checkedDate:'2026-10-27',metricDate:'2026-10-27',displaySales:'500+ bought in past month'});
  const newer = sourceItem('new',{url:'https://www.amazon.com/name/dp/B012345678?ref=abc',displaySales:'1K+ bought in past month'});
  const result = opportunity([older,newer],'fragrance-free');
  assert.equal(result.counts.records,2);
  assert.equal(result.counts.distinctListings,1);
  assert.equal(result.counts.duplicatesRemoved,1);
  assert.equal(result.references[0].id,'new');
  assert.equal(result.counts.sourceBackedSales,1);
  assert.equal(result.salesCohorts.length,1);
  assert.equal(result.salesCohorts[0].observedAt,'2026-11-01');
  assert.equal(result.salesCohorts[0].entries[0].metric.value,1000);
  assert.equal(result.latestCheckedDate,'2026-11-02');
  assert.equal(result.lastSalesDate,'2026-11-01');
});

test('shared category sources do not collapse distinct products and are not exact product evidence',()=>{
  const common = {url:'https://www.amazon.com/s?k=fragrance+free',metricSource:'https://www.amazon.com/s?k=fragrance+free'};
  const a=sourceItem('a',{...common,name:'Fragrance free dish liquid',category:'Dishwashing'});
  const b=sourceItem('b',{...common,name:'Fragrance free laundry liquid'});
  const result=opportunity([a,b],'fragrance-free');
  assert.equal(result.counts.distinctListings,2);
  assert.equal(result.counts.individualItemLinks,0);
  assert.equal(result.counts.broadReferences,2);
  assert.equal(result.counts.withSales,2);
  assert.equal(result.counts.sourceBackedSales,0);
  assert.equal(result.counts.rankableSales,0);
});

test('a category-card sales source can support a dated count when exact item identity is separately present',()=>{
  const a=item('Fragrance-free dish soap','Dishwashing',{
    id:'tt',retailer:'TikTok Shop',url:'https://shop.tiktok.com/us/pdp/soap/1731234567890123456',
    metricSource:'https://shop.tiktok.com/us/k/dish-soap',metricDate:'2026-10-31',
    hasSales:true,displaySales:'12 sold',salesPeriod:'Period not stated',checkedDate:'2026-10-31'
  });
  const result=opportunity([a],'fragrance-free');
  assert.equal(result.counts.sourceBackedSales,1);
  assert.equal(result.salesCohorts[0].period,'Period not stated');
  assert.equal(result.references[0].salesSourceUrl,a.metricSource);
});

test('missing or unsafe sales sources are never counted as source-backed sales',()=>{
  const result=opportunity([
    sourceItem('none',{metricSource:''}),
    sourceItem('unsafe',{url:'https://www.amazon.com/dp/B098765432',metricSource:'javascript:alert(1)'}),
    sourceItem('nodate',{url:'https://www.amazon.com/dp/B011111111',metricDate:''})
  ],'fragrance-free');
  assert.equal(result.counts.withSales,3);
  assert.equal(result.counts.sourceBackedSales,0);
  assert.equal(result.counts.rankableSales,0);
  assert.equal(result.references.some(ref=>ref.salesSourceUrl.startsWith('javascript:')),false);
  assert.equal(model.listingIdentity(sourceItem('bad',{url:'javascript:alert(1)',metricSource:''})).url,'');
});

test('source evidence dates remain distinct from analysis date and do not manufacture a research refresh',()=>{
  const result=model.analyze([sourceItem('one')],{analyzedAt:'2026-11-03'});
  assert.equal(result.summary.analyzedAt,'2026-11-03');
  assert.equal(result.summary.latestCheckedDate,'2026-11-02');
  assert.equal(result.summary.lastSalesDate,'2026-11-01');
  assert.match(result.summary.analysisBasis,/no new retailer verification/);
  assert.equal(model.analyze([]).summary.analyzedAt,'');
});

test('counts recompute from changed data and themes are not summed as unique assortment',()=>{
  const a=item('Fragrance free concentrated dish soap refill','Dishwashing',{id:'a',retailer:'Walmart',url:'https://www.walmart.com/ip/12345'});
  const b=item('Unscented dish liquid','Dishwashing',{id:'b',retailer:'Amazon US',url:'https://www.amazon.com/dp/B012345678'});
  const before=model.analyze([a]), after=model.analyze([a,b]);
  assert.equal(before.summary.uniqueMatchedRecords,1);
  assert.ok(before.opportunities.filter(o=>o.counts.distinctListings).length>1);
  assert.match(before.summary.analysisBasis,/Themes overlap/);
  assert.equal(after.summary.uniqueMatchedRecords,2);
  assert.equal(after.opportunities.find(o=>o.id==='fragrance-free').counts.retailers,2);
  assert.equal(opportunity([a],'fragrance-free').counts.retailers,1);
});

test('supports a missing sales model honestly and does not mutate input',()=>{
  const row=sourceItem('one');const before=JSON.stringify(row);
  const result=model.analyze([row],{salesModel:null});
  assert.equal(result.summary.salesModelAvailable,false);
  assert.equal(result.opportunities.find(o=>o.id==='fragrance-free').counts.sourceBackedSales,0);
  assert.equal(JSON.stringify(row),before);
});

test('references start with retained seeds, followed by a balanced retailer mix',()=>{
  const seed=item('Power electric scrubber','Cleaning Tools',{id:'HC-918a1f6d71fc',retailer:'Meijer',url:'https://www.meijer.com/shopping/product/scrubber/123456'});
  const others=[
    item('Electric scrubber A','Cleaning Tools',{id:'am1',url:'https://www.amazon.com/dp/B012345678'}),
    item('Electric scrubber B','Cleaning Tools',{id:'am2',url:'https://www.amazon.com/dp/B098765432'}),
    item('Electric scrubber C','Cleaning Tools',{id:'wm1',retailer:'Walmart',url:'https://www.walmart.com/ip/123456'})
  ];
  const result=opportunity([...others,seed],'electric-cleaning');
  assert.equal(result.matchedIds[0],seed.id);
  assert.notEqual(result.references[1].retailer,result.references[2].retailer);
  assert.equal(new Set(result.matchedIds).size,result.matchedIds.length);
});

test('empty evidence is labelled unknown, never a proven market or Target gap',()=>{
  const result=opportunity([],'fragrance-free');
  assert.equal(result.counts.distinctListings,0);
  assert.match(result.evidenceLabel,/not proof of a market gap/);
  assert.match(result.gapLabel,/not established/);
});
