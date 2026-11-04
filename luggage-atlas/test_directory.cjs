const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const elements=new Map(),stored=new Map(),listeners=new Map();const el=k=>{if(!elements.has(k))elements.set(k,{innerHTML:'',textContent:'',value:'',hidden:false,disabled:false,checked:false,dataset:{},style:{},addEventListener(){},setAttribute(){},showModal(){this.open=true},close(){this.open=false}});return elements.get(k)};
const ctx={window:{addEventListener(){},scrollTo(){}},document:{querySelector:el,querySelectorAll:()=>[],addEventListener:(name,fn)=>{if(!listeners.has(name))listeners.set(name,[]);listeners.get(name).push(fn)},createElement:()=>({click(){}})},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v),removeItem:k=>stored.delete(k)},location:{hash:''},setTimeout(){},URL:{createObjectURL(){return''},revokeObjectURL(){}},Blob:function(){},console};vm.createContext(ctx);
for(const name of ['data.js','photos.js','weekly.js','atlas-upgrade.js','fashion.js','fashion-ui.js','innovation.js','innovation-ui.js','workbench.js','tutorial.js','offer-photos.js','directory.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx);
const run=code=>vm.runInContext(code,ctx);assert.equal(run('tab'),'start');assert(el('#view').innerHTML.includes('New here? Begin with this step.'));run("location.hash='#directory';render()");assert.equal(run('directoryRows().length'),67);assert.equal(run("directoryRows().filter(p=>directoryCoverage(p).key==='matched').length"),7);assert.equal(run("directoryRows().filter(p=>directoryCoverage(p).key==='qualified').length"),1);assert.equal(run("directoryRows().filter(p=>directoryCoverage(p).key==='gap').length"),1);assert.equal(run("directoryRows().filter(p=>directoryCoverage(p).key==='unreviewed').length"),58);
run("directoryLimit=100;drawDirectory()");assert.equal((el('#directoryRows').innerHTML.match(/class=\"directory-row/g)||[]).length,67);
run("directoryFilters.q='Samsonite';drawDirectory()");assert.equal(run('directoryRows().length'),3);assert(el('#directoryRows').innerHTML.includes('FLATFORM'));assert(el('#directoryRows').innerHTML.includes('Upscape'));assert(el('#directoryRows').innerHTML.includes('Paralux'));
run("directoryFilters={q:'',region:'',currency:'INR',format:'',coverage:'matched',followed:false,sort:'coverage'};drawDirectory()");assert(run("directoryRows().every(p=>p.currency==='INR'&&directoryCoverage(p).key==='matched')"));
run("directoryFilters.coverage='';directoryFilters.currency='';directoryFilters.q='No-such-case';drawDirectory()");assert.equal(run('directoryRows().length'),0);assert(el('#directoryRows').innerHTML.includes('No matching offers'));
run("directoryToggle('offer-a8bb8cf6');directoryFilters.q='Skyline';drawDirectory()");assert(run("itemSelection.has('offer-a8bb8cf6')"));assert(JSON.parse(stored.get('luggage-atlas-cost-desk-v1')).selected.includes('offer-a8bb8cf6'));
run("directoryToggle('offer-1730d13');directoryToggle('offer-39bdd129');directoryToggle('offer-baa5a155');directoryToggle('offer-e74871e')");assert.equal(run('itemSelection.size'),4);assert(!run("itemSelection.has('offer-e74871e')"));
run("followedOffers.add('offer-e74871e');localStorage.setItem('luggage-atlas-followed-offers-v1',JSON.stringify([...followedOffers]));followedOffers.clear();loadFollowing();directoryFilters.q='';directoryFilters.followed=true;drawDirectory()");assert.equal(run('directoryRows().length'),1);assert(el('#directoryRows').innerHTML.includes('20-inch Hardside Carry-On Tan'));
run("directoryFilters.followed=false;csv=(n,rows)=>window.gapRows=rows;exportCoverage()");assert.equal(ctx.window.gapRows.length,68);assert(ctx.window.gapRows.every(r=>r.length===ctx.window.gapRows[0].length));
console.log('PASS: all 67 offers; 7 matched / 1 missing interior / 1 color-qualified / 58 unaudited; exact Samsonite identities; combined and empty filters; 4-offer limit; persistent shortlist/follows; complete photo-gap CSV.');
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
