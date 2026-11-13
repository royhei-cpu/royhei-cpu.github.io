const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const elements=new Map(),stored=new Map(),listeners=new Map();const el=k=>{if(!elements.has(k))elements.set(k,{innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,checked:false,dataset:{},style:{},addEventListener(){},setAttribute(){},showModal(){this.open=true},close(){this.open=false}});return elements.get(k)};
const ctx={window:{addEventListener(){},scrollTo(){}},document:{querySelector:el,querySelectorAll:()=>[],addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)},createElement:()=>({click(){}})},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},location:{hash:''},setTimeout(){},URL:{createObjectURL(){return''},revokeObjectURL(){}},Blob:function(){},console};vm.createContext(ctx);
for(const name of ['data.js','photos.js','weekly.js','atlas-upgrade.js','fashion.js','fashion-ui.js','innovation.js','innovation-ui.js','workbench.js','model-evidence.js','model-catalog.js','tutorial.js','offer-photos.js','directory.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx);
const run=code=>vm.runInContext(code,ctx);assert.equal(run('tab'),'start');assert(el('#view').innerHTML.includes('Start browsing →'));run("location.hash='#directory';render()");assert.equal(run('directoryRows().length'),run('D.prices.length'));assert.equal(run("directoryRows().filter(p=>offerPhotoAudit(p)?.checked==='2026-11-04' && directoryCoverage(p).key==='matched').length"),7);assert.equal(run("directoryRows().filter(p=>offerPhotoAudit(p)?.checked==='2026-11-04' && directoryCoverage(p).key==='qualified').length"),1);assert.equal(run("directoryRows().filter(p=>offerPhotoAudit(p)?.checked==='2026-11-04' && directoryCoverage(p).key==='gap').length"),1);assert.equal(run("directoryRows().filter(p=>directoryCoverage(p).key==='unreviewed').length"),run('D.prices.length - window.ATLAS_PHOTOS.offerAudits.length'));
run("directoryLimit=D.prices.length;drawDirectory()");assert.equal((el('#directoryRows').innerHTML.match(/class=\"directory-row/g)||[]).length,run('modelGroups(offers()).length'));
run("directoryFilters.q='Samsonite';drawDirectory()");assert.equal(run("directoryRows().filter(p => p.brand === 'Samsonite').length"),3);assert(el('#directoryRows').innerHTML.includes('FLATFORM'));assert(el('#directoryRows').innerHTML.includes('Upscape'));assert(el('#directoryRows').innerHTML.includes('Paralux'));
run("directoryFilters={q:'',region:'',currency:'INR',format:'',coverage:'matched',followed:false,sort:'coverage'};drawDirectory()");assert(run("directoryRows().every(p=>p.currency==='INR'&&directoryCoverage(p).key==='matched')"));
run("directoryFilters.coverage='';directoryFilters.currency='';directoryFilters.q='No-such-case';drawDirectory()");assert.equal(run('directoryRows().length'),0);assert(el('#directoryRows').innerHTML.includes('No matching offers'));
run("directoryToggle('offer-a8bb8cf6');directoryFilters.q='Skyline';drawDirectory()");assert(run("itemSelection.has('offer-a8bb8cf6')"));assert(JSON.parse(stored.get('luggage-atlas-cost-desk-v1')).selected.includes('offer-a8bb8cf6'));
run("directoryToggle('offer-1730d13');directoryToggle('offer-39bdd129');directoryToggle('offer-baa5a155');directoryToggle('offer-e74871e')");assert.equal(run('itemSelection.size'),4);assert(!run("itemSelection.has('offer-e74871e')"));
run("followedOffers.add('offer-e74871e');localStorage.setItem('luggage-atlas-followed-offers-v1',JSON.stringify([...followedOffers]));followedOffers.clear();loadFollowing();directoryFilters.q='';directoryFilters.followed=true;drawDirectory()");assert.equal(run('directoryRows().length'),1);assert(el('#directoryRows').innerHTML.includes('20-inch Hardside Carry-On Tan'));
run("directoryFilters.followed=false;csv=(n,rows)=>window.gapRows=rows;exportCoverage()");assert.equal(ctx.window.gapRows.length,run('D.prices.length')+1);assert(ctx.window.gapRows.every(r=>r.length===ctx.window.gapRows[0].length));
console.log('PASS: all current offers; preserved 7 matched / 1 missing interior / 1 color-qualified photo audits; exact Samsonite identities; combined and empty filters; 4-offer limit; persistent shortlist/follows; complete photo-gap CSV.');
// The column control shares positioning state with the top filter and exports.
run("location.hash='#brands';selected.clear();filters={q:'',region:'',tier:'',style:''};render()");
assert(el('#view').innerHTML.includes('id="brandTierColumn"'));assert(el('#view').innerHTML.includes('aria-label="Filter brand positioning"'));
el('#brandTierColumn').onchange({target:{value:'Premium'}});
assert.equal(el('#brandTier').value,'Premium');assert.equal(el('#brandTierColumn').value,'Premium');assert(run("filteredBrands().length>0&&filteredBrands().every(b=>b.tier==='Premium')"));
run("togglePick(filteredBrands()[0].id)");const picked=run('[...selected][0]');
el('#brandTier').onchange({target:{value:'Value'}});
assert.equal(el('#brandTierColumn').value,'Value');assert(run("filteredBrands().length>0&&filteredBrands().every(b=>b.tier==='Value')"));assert(run(`selected.has(${JSON.stringify(picked)})`));
const region=run('filteredBrands()[0].region');el('#brandRegion').onchange({target:{value:region}});
assert(run(`filteredBrands().every(b=>b.tier==='Value'&&b.region===${JSON.stringify(region)})`));
run("selected.clear();window.originalBrandCSV=csv;csv=(name,rows)=>window.brandFilterExport=rows;exportBrands();csv=window.originalBrandCSV");
assert.equal(ctx.window.brandFilterExport.length,run('filteredBrands().length')+1);assert(ctx.window.brandFilterExport.slice(1).every(row=>row[3]==='Value'&&row[2]===region));
run("filters.q='No-such-positioned-brand';drawBrandRows()");assert(el('#brandRows').innerHTML.includes('No matching brands'));assert.equal(el('#brandTierColumn').value,'Value');
el('#resetBrands').onclick();assert.equal(run('filteredBrands().length'),run('D.brands.length'));assert.equal(el('#brandTier').value,'');assert.equal(el('#brandTierColumn').value,'');
console.log('PASS: column positioning filter, two-way sync, combined region filtering, preserved shortlist, filtered CSV and reset.');

// Test the visual document serializer with actual local photo bytes, without a browser.
ctx.Blob=function(parts){ctx.window.visualDocument=parts.join('')};
ctx.fetch=async relative=>({ok:true,blob:async()=>({bytes:fs.readFileSync(path.join(__dirname,relative))})});
ctx.FileReader=class{readAsDataURL(blob){this.result='data:image/jpeg;base64,'+blob.bytes.toString('base64');this.onload();}};
(async()=>{run("itemSelection=new Set(['offer-1730d13','offer-39bdd129','offer-a8bb8cf6','offer-baa5a155'])");await run('exportVisualShortlist()');const html=ctx.window.visualDocument;assert(html.includes('data:image/jpeg;base64,'));assert(html.includes('Collection alternative'));assert(html.includes('offer color unspecified'));assert(html.includes('Paralux'));assert(html.includes('Aerolite'));if(process.env.PHOTO_VISUAL_EXPORT)fs.writeFileSync(process.env.PHOTO_VISUAL_EXPORT,html);console.log('PASS: visual shortlist exports embedded photographs, exact identities, qualified/alternative labels, gaps and source links.');})().catch(e=>{console.error(e);process.exitCode=1});

// Each verified family joins original offer IDs. Revisions, named cases and sets stay independently selectable.
run(`{
  const rows=offers(), groups=modelGroups(rows);
  const uniqueIds=new Set(rows.map(p=>p.id));
  if ([...membership.keys()].some(id=>!uniqueIds.has(id))) throw Error('Unknown reviewed offer');
  if (groups.flatMap(g=>g.offers).length!==rows.length) throw Error('Lost offers');
  if (groups.filter(g=>g.name==='STAND U plus')[0].offers.length!==6) throw Error('STAND U plus');
  const getaway=groups.find(g=>g.offers[0].brand==='BAGSMART');
  if (getaway.offers.length!==12 || new Set(getaway.offers.map(p=>identity(p).variant.color)).size!==12) throw Error('Getaway colors');
  for(const name of ['STAND U','COLOR YOU Kei']) {
    const family=groups.find(g=>g.name===name);
    if(!family.offers.some(p=>identity(p).variant.size==='XL')||!family.offers.some(p=>identity(p).variant.size==='S'))throw Error('Cross-page XL size');
  }
  const speed=groups.filter(g=>['SPEED U','SPEED U plus'].includes(g.name));
  if (speed.length!==2 || speed.some(g=>g.offers.length!==2)) throw Error('SPEED U generation boundary');
  const brisbane=groups.filter(g=>g.name.startsWith('Brisbane'));
  if (brisbane.length<2 || brisbane.some(g=>g.offers.some(p=>p.product.includes('Set of')) && g.offers.some(p=>!p.product.includes('Set of')))) throw Error('Set merged into single case');
  const aliasBrand=brandBy('Frequenter');
  directoryFilters={q:'',brand:aliasBrand.id};
  const labels=new Set(directoryRows().map(p=>p.brand));
  if(!labels.has('Frequenter')||!labels.has('FREQUENTER'))throw Error('Aliases lost from brand drilldown');
  if(!brandModelSummary(aliasBrand).includes(directoryRows().length+' priced offers'))throw Error('Brand scope mismatch');
  const recent=recentLaunches();
  if(!recent.items.some(l=>l.brand==='MILESTO') || recent.items.some(l=>l.brand==='BAGSMART'))throw Error('Launch vs price observation');
  if(modelGroups([{...rows[0],id:'future-unknown'}])[0].matched) throw Error('Unreviewed listing merged');
  csv=(name,cells)=>window.modelCSV=cells;
  exportModels(getaway.offers);
  if(window.modelCSV.length!==2 || window.modelCSV[1][4]!==12)throw Error('Model-level CSV');
  exportModelOffers(getaway.offers);
  if(window.modelCSV.length!==13 || window.modelCSV.some(r=>r.length!==window.modelCSV[0].length))throw Error('Offer-level CSV');
}`);
