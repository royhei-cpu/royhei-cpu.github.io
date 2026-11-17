const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');const p=__dirname;const read=f=>fs.readFileSync(path.join(p,f),'utf8');const g={};g.window=g;vm.createContext(g);for(const f of ['data.js','research-data.js','model-features.js','feature-inspiration.js','feature-trends.js','research.js'])vm.runInContext(read(f),g);const M=g.AtlasResearchMath;
assert.equal(M.rows('search').length,9);assert.equal(M.rows('search')[0].brand,'Samsonite');assert.equal(M.rows('momentum')[0].brand,'RIMOWA');assert.equal(M.rows('sales')[0].amount,1350.4);assert.equal(M.rows('retailer')[0].rank,1);assert.equal(M.rows('search','no-such-brand').length,0);assert.equal(M.rows('search','July').length,1);assert.equal(M.rows('search','','alpha')[0].brand,'American Tourister');for(const mode of ['search','momentum','sales','retailer']){const svg=M.chart(M.rows(mode),mode);assert(svg.includes('<svg'));assert(!svg.includes('NaN'));assert(svg.includes('Source:'));}assert(M.csv([['a,b','-17']]).includes('"a,b"'));assert(M.csv([['=cmd']]).includes("'=cmd"));
for(const t of g.ATLAS_FEATURE_TRENDS.trends){const r=g.ATLAS_MODEL_FEATURES.records.find(r=>r.id===t.record);assert(r,t.id);const module=g.AtlasInspiration.byId.get(t.module);assert(module,t.module);assert(g.AtlasInspiration.forRecord(r).some(m=>m.id===t.module),`${t.id} must map to a documented model feature`);assert(t.sources.length&&t.checked&&t.qualification&&t.bom);}
const july=g.ATLAS_MODEL_FEATURES.records.find(r=>r.id==='offer-30050715');assert(g.AtlasInspiration.forRecord(july).some(m=>m.id==='smarttracking'));assert(!g.AtlasInspiration.forRecord(july).some(m=>m.id==='tracker'));const html=g.featureTrendDashboard();for (const trend of g.ATLAS_FEATURE_TRENDS.trends) assert(html.includes('features.html?model='+encodeURIComponent(trend.record)));assert.doesNotMatch(html,/studio\.html|Use in workshop|BOM brief/);
for(const r of g.ATLAS_MODEL_FEATURES.records){assert.equal(r.featureCount,Object.keys(r.features).length);if(r.photoKind==='brand-reference')assert(r.photoScope.includes('Exact model photograph remains unverified'));}
console.log('PASS: source-specific sort/filter, signed momentum, CSV/SVG serialization, model-level feature sources, tracking module distinction, photo scopes and feature counts.');

for(const r of g.ATLAS_MODEL_FEATURES.records.filter(r=>r.brandId==="peak-design")){const ids=g.AtlasInspiration.forRecord(r).map(x=>x.id);assert(ids.includes("tracker"));assert(!ids.includes("smarttracking"),"Roller Lite pocket must not import integrated electronics");}
assert(html.includes(g.ATLAS_FEATURE_TRENDS.checked));

function insightsRegression() {
  const evidence = JSON.parse(read('research-data.json'));
  assert.deepEqual(JSON.parse(JSON.stringify(g.ATLAS_RESEARCH)), evidence);
  vm.runInContext(read('market-research.js'),g);
  const insights = g.AtlasMarketResearch;
  assert.equal(insights.cagr(100,121,2).toFixed(2),'10.00');
  assert.equal(insights.cagr(100,0,2),-100);
  assert.equal(insights.cagr(0,121,2),null);
  assert.equal(insights.cagr(100,121,0),null);
  const offerRows = insights.benchmarks();
  assert.equal(offerRows.length,evidence.carryOnBenchmark.offerIds.length);
  assert(offerRows.every(o=>o.price.currency==='USD' && o.price.format==='Carry-on'));
  assert(M.csv([[-5,'-formula']]).includes(`"-5","'-formula"`));
  const elements = new Map();
  function element(id) {
    if(!elements.has(id)) elements.set(id,{id,events:{},addEventListener(event,fn){this.events[event]=fn;},contains(){return false;}});
    return elements.get(id);
  }
  g.document={getElementById:element};
  g.matchMedia=()=>({matches:true,addEventListener(){}});
  let exported,graphic,csvName,svgName;
  insights.bind((rows,name)=>{exported=rows;csvName=name;},(value,name)=>{graphic=value;svgName=name;});
  const changed = (id,value) => element('marketFilters').events.change({target:{id,value}});
  const csv = () => {element('marketCsv').events.click();return exported;};
  const svg = () => {element('marketSvg').events.click();return graphic;};
  for(const view of insights.views) {
    insights.show(view);
    assert(svg().includes('<desc'));
    assert(!/NaN|undefined/.test(svg()));
    assert(csv().length>2);
  }
  insights.show('market');
  assert.deepEqual(Array.from(csv().slice(1),r=>r[0]),[2025,2026,2033]);
  assert.equal(csv().at(-1)[3],8.7);
  insights.show('growth');
  changed('growthSeries','travel');
  changed('growthFrom','2024');
  assert.equal(csv().length,3);
  assert.equal(csv().at(-1)[5],Number((100*(2223.7/2357.2-1)).toFixed(4)));
  assert(!element('marketFilters').innerHTML.includes('id="growthPeer"'));
  insights.show('travelers');
  changed('travelerYear','2025');
  assert(element('marketReading').innerHTML.includes('25.43 pp'));
  changed('travelerPopulation','us');
  assert.equal(csv()[1][2],11180);
  assert.equal(csv()[1][3],125000);
  assert(Math.abs(csv().slice(1).reduce((sum,r)=>sum+r[1],0)-100)<.01);
  const fullPrices = g.ATLAS.prices;
  const snapshotPrices = evidence.carryOnBenchmark.annotations;
  g.ATLAS.prices = fullPrices.filter(price => offerRows.some(offer => {
    const stamp=snapshotPrices[offer.id].observation;
    return price.source===offer.model.source && price.date===stamp.date && price.amount===stamp.amount;
  }));
  insights.show('benchmarks');
  changed('benchmarkReference','offer-445efe79');
  changed('benchmarkFeature','tracking');
  const priceRows=csv().slice(1),openStory=priceRows.find(r=>r[1]==='Open Story');
  assert.equal(openStory[11],-93.4);
  assert.equal(openStory[12],-54.97);
  assert.equal(priceRows.find(r=>r[0]==='offer-445efe79')[11],0);
  assert(priceRows.find(r=>r[1]==='Away')[14].includes('pocket'));
  assert(element('marketTable').innerHTML.includes('features.html?model=offer-445efe79'));
  const byHeader = (table, row, column) => {
    assert(table[0].includes(column),column);
    return row[table[0].indexOf(column)];
  };
  const offerRow = (table,brand) => table.slice(1).find(row=>row[1]===brand);

  insights.show('market');
  let values=csv(), end=values.at(-1);
  assert.equal(byHeader(values,end,'Annual intervals'),7);
  assert.equal(byHeader(values,end,'Endpoint-implied CAGR (%)'),8.6765);
  assert.match(svg(),/Selected years.*travel, business and casual bags/);
  assert(svg().includes('href="'+evidence.outlook.source+'"'));

  for (const [key,label] of Object.entries(evidence.annualSales.series)) {
    insights.show('growth');
    changed('growthSeries',key);
    changed('growthPeer','');
    const years=evidence.annualSales.records, last=years.at(-1), prior=years.at(-2);
    for (const start of years.slice(0,-1)) {
      changed('growthFrom',start.year);
      values=csv(); end=values.at(-1);
      const intervals=last.year-start.year;
      const expected=100*Math.expm1(Math.log(last[key]/start[key])/intervals);
      assert.equal(end[1],label);
      assert.equal(end[5],Number(expected.toFixed(4)));
      assert.equal(byHeader(values,end,'Annual intervals'),intervals);
      assert.equal(byHeader(values,end,'Latest YoY (%)'),Number((100*(last[key]-prior[key])/prior[key]).toFixed(4)));
      assert.equal(byHeader(values,end,'Series scope'),evidence.annualSales.seriesScope[key]);
      assert(svg().includes('totals overlap'));
    }
  }
  changed('growthSeries','samsonite');
  changed('growthPeer','tumi');
  assert.match(svg(),/TUMI · CAGR .*latest YoY/);

  insights.show('travelers');
  changed('travelerPopulation','eu');
  for (const year of evidence.travelParticipation.years) {
    changed('travelerYear',year);
    values=csv();
    assert.equal(csvName,'Luggage_Atlas_travelers_EU27_'+year+'.csv');
    assert.match(svg(),/Within age band, ≥1 overnight personal trip/);
    assert(svg().includes('Published EU ages 15+ aggregate'));
    assert.equal(svgName,csvName.replace('.csv','.svg'));
    assert.match(byHeader(values,values.at(-1),'Denominator'),/Published aggregate/);
  }
  changed('travelerPopulation','us'); values=csv();
  assert.equal(csvName,'Luggage_Atlas_travelers_US_2026-Q2.csv');
  assert.match(svg(),/11,180 respondents answered the income question/);
  assert.match(svg(),/Excludes Canada and Mexico · weighted to air departures/);
  assert(svg().includes('href="'+evidence.travelerIncome.source+'"'));
  assert.equal(svgName,csvName.replace('.csv','.svg'));
  assert(byHeader(values,values[1],'Response base / weighting').includes('weighted'));

  insights.show('benchmarks');
  const snapshot=evidence.carryOnBenchmark;
  const referenceChoices=[...snapshot.offerIds,'offer-8efb979d@regular','offer-77c46470@regular'];
  for (const key of referenceChoices) {
    changed('benchmarkReference',key);
    values=csv();
    const [id,regular]=key.split('@'), ref=values.slice(1).find(row=>row[0]===id);
    const cents=Math.round(100*(regular ? byHeader(values,ref,'Displayed regular price (USD)') : ref[6]));
    for (const row of values.slice(1)) {
      const gap=Math.round(100*row[6])-cents;
      assert.strictEqual(row[10],cents/100);
      assert.strictEqual(row[11],gap/100);
      assert.strictEqual(row[12],Number((gap*100/cents).toFixed(2)));
      assert(svg().includes(row[2]) && svg().includes(row[8]) && svg().includes(row[7]));
      assert(element('marketTable').innerHTML.includes('features.html?model='+row[0]));
    }
  }
  changed('benchmarkReference',snapshot.defaultReference);
  values=csv();
  assert.deepEqual(Array.from(values.slice(1),row=>row[11]),[-34.01,0,93.4,251.5,328.46]);
  assert.equal(byHeader(values,offerRow(values,'American Dreamliner'),'Seller'),'Concept One Accessories');
  assert.equal(byHeader(values,offerRow(values,'American Dreamliner'),'Previous price (USD)'),49.99);
  assert.equal(byHeader(values,offerRow(values,'American Dreamliner'),'Displayed regular price (USD)'),'');
  assert.equal(byHeader(values,offerRow(values,'Quince'),'Comparison value (USD)'),315);
  assert.equal(byHeader(values,offerRow(values,'Quince'),'Previous price (USD)'),'');
  assert.equal(byHeader(values,offerRow(values,'Quince'),'Comparison value checked'),'2026-11-17');
  assert.equal(byHeader(values,offerRow(values,'Peak Design'),'SKU or retailer item ID'),'W-RL-AA-BK-1');
  changed('benchmarkReference',snapshot.defaultReference+'@regular');
  values=csv();
  assert.equal(offerRow(values,'Quince')[11],79.9);
  assert.equal(offerRow(values,'Open Story')[11],-13.5);
  assert.equal(byHeader(values,offerRow(values,'Quince'),'Reference observation date'),'2026-11-03');

  changed('benchmarkFeature','laptop'); values=csv();
  assert.match(offerRow(values,'Quince')[14],/Front-access.*16 in/);
  assert.equal(offerRow(values,'Open Story')[14],'Not yet recorded');
  assert.equal(offerRow(values,'Quince')[17],'2026-11-17');
  changed('benchmarkFeature','dimensions'); values=csv();
  assert.match(offerRow(values,'Open Story')[14],/21.75 × 14.25 × 9.75/);
  assert.equal(offerRow(values,'Open Story')[16],'https://www.target.com/p/-/A-86391405');
  changed('benchmarkFeature','expansion');
  assert.equal(offerRow(csv(),'American Dreamliner')[14],'Non-expandable');
  changed('benchmarkFeature','wheels');
  assert.match(offerRow(csv(),'Away')[14],/StopLock/);
  changed('benchmarkFeature','brake');
  assert.match(offerRow(csv(),'Away')[14],/StopLock/);
  changed('benchmarkFeature','compression');
  assert.match(offerRow(csv(),'Quince')[14],/compression panels/);
  assert(element('marketSources').innerHTML.includes('./#workbench'));

  const prices=g.ATLAS.prices, audited=insights.benchmarks();
  const lookup=brand=>audited.find(o=>o.model.brand===brand).price;
  const peak=lookup('Peak Design'), dreamliner=lookup('American Dreamliner'), quince=lookup('Quince');
  const later={date:'2026-11-18',amount:549.95};
  try {
    // Family prices, wrong variants, other sellers and non-U.S. offers cannot replace an exact offer.
    g.ATLAS.prices=prices.concat([
      {...peak,...later,sku:'other-SKU'},{...peak,...later,sku:undefined},
      {...peak,...later,color:'Blue'},{...peak,...later,size:'Trunk'},
      {...peak,...later,market:'Canada'},{...peak,...later,retailer:'Other store'},
      {...dreamliner,...later},{...dreamliner,...later,seller:'Other seller'},
      {...quince,...later,amount:165},{...lookup('Open Story'),...later,amount:85,regular:95}
    ]);
    insights.show('benchmarks'); values=csv();
    assert.equal(offerRow(values,'Peak Design')[6],404.96);
    assert.equal(offerRow(values,'American Dreamliner')[6],42.49);
    assert.equal(offerRow(values,'Quince')[6],165);
    assert.equal(byHeader(values,offerRow(values,'Quince'),'Comparison value (USD)'),'');
    assert.equal(byHeader(values,offerRow(values,'Quince'),'Comparison value checked'),'');
    changed('benchmarkReference',snapshot.defaultReference+'@2026-11-03');
    assert.equal(offerRow(csv(),'Quince')[10],76.5);
    changed('benchmarkReference',snapshot.defaultReference+'@regular-2026-11-03');
    assert.equal(offerRow(csv(),'Quince')[10],90);
  } finally { g.ATLAS.prices=fullPrices; }
  console.log('PASS: source mirrors, 15 historical CAGRs, latest YoY, survey denominators, 35 retail price gaps, dated features, offer identity and CSV/SVG exports.');
}
insightsRegression();
