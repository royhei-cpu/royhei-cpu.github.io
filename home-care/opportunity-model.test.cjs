'use strict';
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
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
  assert.equal(model.definitions.length,39);
  assert.ok(model.definitions.slice(0,7).every(d=>d.seedIds.length&&d.original));
  assert.ok(model.definitions.slice(7).every(d=>d.priority==='Explore'&&!d.original));
  assert.ok(model.definitions.every(d=>d.gapLabel.includes('not established')));
});

test('places every direction in a substantive platform with a complete customer and merchant brief',()=>{
  assert.equal(model.platforms.length,8);
  assert.equal(new Set(model.definitions.map(d=>d.id)).size,model.definitions.length);
  for(const definition of model.definitions){
    const platform=model.platforms.find(p=>p.id===definition.platformId);
    assert.ok(platform,definition.id);
    assert.equal(definition.platform,platform.title);
    assert.equal(definition.portfolioRoleKey,definition.original?'umbrella':'concept');
    assert.equal(definition.portfolioRole,definition.original?'Umbrella direction':'Specific concept');
    for(const field of ['customerNeed','differentiation','concept','rationale','next','matchRule','caveat']){
      assert.ok(typeof definition[field]==='string'&&definition[field].length>30,definition.id+': '+field);
    }
  }
  assert.ok(model.platforms.every(p=>p.customerNeed&&p.description));
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

test('new task matchers separate tools, formulas, compatible formats and scent names',()=>{
  const cases=[
    ['mop-bucket-system','Spin mop and bucket system with 2 replacement heads','Cleaning Tools',true],
    ['mop-bucket-system','Bucket organizer and towel holder','Cleaning Tools',false],
    ['mop-bucket-system','Electric spray mop, no bucket needed','Cleaning Tools',false],
    ['mop-bucket-system','Spin mop with bucket','Food Wrap & Storage',false],
    ['quick-floor-system','Microfiber spray mop kit','Cleaning Tools',true],
    ['quick-floor-system','Disposable mop pads refill','Floor & Carpet Care',true],
    ['quick-floor-system','Spray bottle and cleaning cloth','Cleaning Tools',false],
    ['quick-floor-system','Looped cotton string mop refill','Cleaning Tools',false],
    ['dust-hair-tools','Pet hair remover lint roller','Cleaning Tools',true],
    ['dust-hair-tools','Extendable surface duster kit','Cleaning Tools',true],
    ['dust-hair-tools','Compressed air duster','Cleaning Tools',false],
    ['dust-hair-tools','Diatomaceous earth pesticide duster','Cleaning Tools',false],
    ['sink-side-tools','Non-scratch scrub sponges','Cleaning Tools',true],
    ['sink-side-tools','Soap-dispensing dish brush','Cleaning Tools',true],
    ['sink-side-tools','Dishwand replacement sponge heads','Cleaning Tools',true],
    ['sink-side-tools','Soap dispenser with sponge holder','Cleaning Tools',false],
    ['sink-side-tools','Gentle dish liquid soap','Dishwashing',false],
    ['reusable-cloth-system','Reusable Swedish dishcloths','Cleaning Tools',true],
    ['reusable-cloth-system','Microfiber cloth kitchen pack','Cleaning Tools',true],
    ['reusable-cloth-system','Microfiber car drying towel','Cleaning Tools',false],
    ['reusable-cloth-system','Reusable microfiber mop pads and sweeping cloths','Cleaning Tools',false],
    ['reusable-cloth-system','Disposable paper towels','Paper Towels',false],
    ['glass-mirror-care','Glass and mirror cleaner spray','Specialty Cleaners',true],
    ['glass-mirror-care','Window cleaning squeegee','Cleaning Tools',true],
    ['glass-mirror-care','Glass food storage container','Food Wrap & Storage',false],
    ['glass-mirror-care','Automotive windshield cleaner','Specialty Cleaners',false],
    ['glass-mirror-care','Cooktop cleaner for glass cooking surfaces','Surface Cleaners',false],
    ['kitchen-grease','Oven and grill cleaner foam','Specialty Cleaners',true],
    ['kitchen-grease','Kitchen grease remover','Surface Cleaners',true],
    ['kitchen-grease','Kitchen antibacterial all purpose cleaner','Surface Cleaners',false],
    ['kitchen-grease','Melamine sponge cleaning pads for oven and kitchen, universal cleaner','Surface Cleaners',false],
    ['appliance-surface-care','Stainless steel appliance cleaner and polish','Specialty Cleaners',true],
    ['appliance-surface-care','Cooktop cleaning cream','Specialty Cleaners',true],
    ['appliance-surface-care','Microfiber cloth for cleaning wood and stainless steel','Surface Cleaners',false],
    ['appliance-surface-care','Dishwasher cleaner for stainless steel machines','Specialty Cleaners',false],
    ['appliance-surface-care','Stainless steel cleaner for cookware pots and pans','Specialty Cleaners',false],
    ['wood-furniture-care','Wood cabinet cleaner and polish','Specialty Cleaners',true],
    ['wood-furniture-care','Microfiber cloth for cleaning wood and furniture','Surface Cleaners',false],
    ['wood-furniture-care','Wood floor cleaner','Specialty Cleaners',false],
    ['wood-furniture-care','Outdoor plastic furniture cleaner','Specialty Cleaners',false],
    ['stone-surface-care','Granite Gold Quartz Clean & Shine','Specialty Cleaners',true],
    ['stone-surface-care','Granite and marble countertop cleaner','Surface Cleaners',true],
    ['stone-surface-care','Granite Gold all purpose cleaner','Specialty Cleaners',false],
    ['stone-surface-care','Cloth for glass, wood and granite','Surface Cleaners',false],
    ['floor-surface-care','Hardwood and laminate floor cleaner refill','Floor & Carpet Care',true],
    ['floor-surface-care','Hardwood spray mop kit with cleaner','Floor & Carpet Care',false],
    ['floor-surface-care','Hardwood and laminate floor cleaner','Food Wrap & Storage',false],
    ['carpet-upholstery-care','Upholstery spot stain remover spray 16 oz','Floor & Carpet Care',true],
    ['carpet-upholstery-care','Carpet machine cleaning solution 1 gal','Floor & Carpet Care',true],
    ['carpet-upholstery-care','Cordless carpet cleaner vacuum 16 oz tank','Floor & Carpet Care',false],
    ['carpet-upholstery-care','Carpet brush replacement','Floor & Carpet Care',false],
    ['shower-routine','Daily shower cleaner spray','Bathroom & Toilet Cleaning',true],
    ['shower-routine','Bathroom soap scum remover','Bathroom & Toilet Cleaning',true],
    ['shower-routine','Bathroom all purpose cleaner','Bathroom & Toilet Cleaning',false],
    ['shower-routine','Shower cleaning brush','Surface Cleaners',false],
    ['shower-routine','Mold remover for shower grout','Bathroom & Toilet Cleaning',false],
    ['laundry-dose','Laundry detergent sheets 60 loads','Laundry Care',true],
    ['laundry-dose','Tide PODS original liquid laundry detergent','Laundry Care',true],
    ['laundry-dose','Laundry tablets, detergent pacs with storage tin','Naturals',true],
    ['laundry-dose','Liquid laundry detergent, pack of 2','Laundry Care',false],
    ['laundry-dose','Laundry detergent for bed sheets','Laundry Care',false],
    ['laundry-dose','Dishwasher detergent tablets','Dishwashing',false],
    ['fabric-finishing','Wool dryer balls 6 pack','Laundry Care',true],
    ['fabric-finishing','Unscented fabric softener','Laundry Care',true],
    ['fabric-finishing','Laundry detergent with fabric softener','Laundry Care',false],
    ['fabric-finishing','5 in 1 laundry pods, fragrance and fabric softener','Laundry Care',false],
    ['fabric-finishing','In-wash scent booster beads','Laundry Care',false],
    ['fabric-refresh','Fabric odor-fighting spray','Air Care',true],
    ['fabric-refresh','Room and linen mist','Air Care',true],
    ['fabric-refresh','Linen and Sky air freshener spray','Air Care',false],
    ['fabric-refresh','Pure Linen Scent Air Freshener Spray','Air Care',false],
    ['fabric-refresh','Laundry detergent, fabric refresher formula','Laundry Care',false],
    ['passive-odor-care','Activated charcoal odor absorber','Air Care',true],
    ['passive-odor-care','Hanging moisture absorber eliminates musty odors','Air Care',true],
    ['passive-odor-care','Charcoal grey room fragrance diffuser','Air Care',false],
    ['passive-odor-care','Odor eliminator spray','Air Care',false],
    ['passive-odor-care','Odor absorber aerosol 10 oz','Air Care',false],
    ['bath-tissue','2-ply bath tissue family pack','Toilet Paper & Tissues',true],
    ['bath-tissue','Flushable wet wipes, toilet paper companion','Toilet Paper & Tissues',false],
    ['facial-tissue','Lotion facial tissues pocket pack','Toilet Paper & Tissues',true],
    ['facial-tissue','Facial makeup removal wipes','Toilet Paper & Tissues',false],
    ['prep-liners','Unbleached parchment paper roll','Food Wrap & Storage',true],
    ['prep-liners','Silicone baking mat','Food Wrap & Storage',true],
    ['prep-liners','Silicone furniture cover','Food Wrap & Storage',false],
    ['prep-liners','Reusable aluminum foil storage bags with zipper','Food Wrap & Storage',false],
    ['drinkware-serving','Insulated paper hot drink cups with lids','Disposable Tabletop',true],
    ['drinkware-serving','Plastic measuring cup','Disposable Tabletop',false],
    ['drinkware-serving','Paper plate and bowl pack','Disposable Tabletop',false]
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

test('platform evidence is a deduplicated union rather than a sum of overlapping directions',()=>{
  const a=sourceItem('a',{name:'Fragrance-free concentrated laundry detergent pods refill',metricDate:'2026-10-27'});
  const b=sourceItem('b',{name:'Fragrance-free concentrated laundry detergent pods refill',url:'https://www.amazon.com/product-name/dp/B012345678?ref=new',metricDate:'2026-11-01'});
  const out=model.analyze([a,b],{analyzedAt:'2026-11-03'});
  const platform=out.platforms.find(p=>p.id==='refill-formula');
  assert.equal(platform.counts.records,2);
  assert.equal(platform.counts.distinctListings,1);
  assert.equal(platform.counts.duplicatesRemoved,1);
  assert.equal(platform.counts.sourceBackedSales,1);
  assert.equal(platform.counts.rankableSales,1);
  assert.equal(platform.lastSalesDate,'2026-11-01');
  assert.equal(platform.latestCheckedDate,'2026-11-02');
  assert.equal(platform.umbrellaCount,1);
  assert.equal(platform.conceptCount,1);
  assert.ok(platform.opportunityIds.includes('sustainable-formats'));
  assert.ok(platform.opportunityIds.includes('fragrance-free'));
  assert.match(platform.countBasis,/do not sum/);
  assert.equal(out.summary.uniqueMatchedRecords,2);
  assert.equal(out.summary.uniqueMatchedListings,1);
  assert.ok(out.platforms.reduce((sum,p)=>sum+p.counts.distinctListings,0)>out.summary.uniqueMatchedListings);
  assert.equal(model.analyze([]).summary.supportedPlatformCount,0);
});

const snapshotPath=path.join(__dirname,'site/all-items-snapshot.json');
test('full saved catalogue supports each added direction and covers the existing category breadth',{skip:!fs.existsSync(snapshotPath)},()=>{
  const rows=JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
  const out=model.analyze(rows,{analyzedAt:'2026-11-03'});
  assert.equal(out.summary.supportedCount,39);
  assert.equal(out.summary.supportedPlatformCount,8);
  assert.equal(out.summary.umbrellaCount,7);
  assert.equal(out.summary.conceptCount,32);
  assert.deepEqual(out.summary.matchedCategories,[...new Set(rows.map(row=>row.category))].sort());
  for(const direction of out.opportunities.slice(18)){
    assert.ok(direction.counts.titleMatched>=3,direction.id+' needs multiple actual format matches');
    assert.ok(direction.counts.retailers>=2,direction.id+' needs comparison breadth');
    assert.ok(direction.counts.individualItemLinks>=2,direction.id+' needs exact listing references');
  }
  const known=[
    ['mop-bucket-system','CMP-197'],['quick-floor-system','CMP-028'],['dust-hair-tools','CMP-104'],
    ['sink-side-tools','CMP-060'],['reusable-cloth-system','CMP-011'],['glass-mirror-care','CMP-052'],
    ['kitchen-grease','CMP-049'],['appliance-surface-care','HC-43ad1f8e1559'],['wood-furniture-care','CMP-180'],
    ['stone-surface-care','HC-935ebea987db'],['floor-surface-care','CMP-029'],['carpet-upholstery-care','CMP-275'],
    ['shower-routine','CMP-030'],['laundry-dose','CMP-115'],['fabric-finishing','CMP-373'],
    ['fabric-refresh','CMP-079'],['passive-odor-care','CMP-380'],['bath-tissue','HC-5550449df59e'],
    ['facial-tissue','HC-f6847b8ab1be'],['prep-liners','NEW-433'],['drinkware-serving','NEW-436']
  ];
  for(const [definitionId,id] of known){
    const row=rows.find(row=>row.id===id);
    assert.ok(row,id);
    assert.ok(model.match(row,definitionId),definitionId+': '+id);
  }
  const uniqueRecords=new Set(out.opportunities.flatMap(o=>o.recordIds));
  const expectedListings=new Set(rows.filter(row=>uniqueRecords.has(row.id)).map(model.listingIdentity).map(identity=>identity.key));
  assert.equal(out.summary.uniqueMatchedRecords,uniqueRecords.size);
  assert.equal(out.summary.uniqueMatchedListings,expectedListings.size);
  assert.ok(out.summary.uniqueMatchedListings<rows.length);
});
