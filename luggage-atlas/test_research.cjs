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
  let exported,graphic;
  insights.bind(rows=>{exported=rows;},value=>{graphic=value;});
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
  insights.show('benchmarks');
  changed('benchmarkReference','offer-445efe79');
  changed('benchmarkFeature','tracking');
  const priceRows=csv().slice(1),openStory=priceRows.find(r=>r[1]==='Open Story');
  assert.equal(openStory[11],-93.4);
  assert.equal(openStory[12],-54.97);
  assert.equal(priceRows.find(r=>r[0]==='offer-445efe79')[11],0);
  assert(priceRows.find(r=>r[1]==='Away')[14].includes('pocket'));
  assert(element('marketTable').innerHTML.includes('features.html?model=offer-445efe79'));
  console.log('PASS: source mirrors, historical/forecast CAGR, survey denominators, exact-offer price gaps, feature sources and filtered CSV/SVG.');
}
insightsRegression();
