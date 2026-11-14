const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const elements=new Map(),saved=new Map();const el=k=>{if(!elements.has(k))elements.set(k,{innerHTML:'',textContent:'',hidden:false,dataset:{},style:{},addEventListener(){},setAttribute(){},showModal(){this.open=true},close(){this.open=false}});return elements.get(k)};
const ctx={window:{addEventListener(){},scrollTo(){}},document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({click(){}})},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},location:{hash:'#overview'},setTimeout(){},URL:{createObjectURL(){return''},revokeObjectURL(){}},Blob:function(){},console};vm.createContext(ctx);
for(const name of ['data.js','photos.js','weekly.js','atlas-upgrade.js','fashion.js','fashion-ui.js','innovation.js','innovation-ui.js','workbench.js','model-evidence.js','model-catalog.js','tutorial.js','offer-photos.js','directory.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx);
function run(code){return vm.runInContext(code,ctx)}

const edition = ctx.window.ATLAS_WEEKLY;
// Keep the current source-review download and latest bulletin when retiring UI.
const dashboard = run('weeklyDashboard()');
const sourceReview = dashboard.match(/href="(source-review-[0-9]{4}-[0-9]{2}-[0-9]{2}[.]csv)"/);
assert(sourceReview, 'Keep source-check CSV download');
assert.equal(sourceReview[1], 'source-review-' + edition.edition + '.csv');
assert(fs.existsSync(path.join(__dirname, sourceReview[1])), 'Source-check download exists');
if (edition.latestBulletin) {
  assert(dashboard.includes(run('E(window.ATLAS_WEEKLY.latestBulletin.title)')), 'Keep latest bulletin title');
  assert(dashboard.includes(run('E(window.ATLAS_WEEKLY.latestBulletin.source)')), 'Keep latest bulletin source');
}
assert.equal(run('weeklyRows().length'), edition.items.length);
for (const row of edition.items) {
  ctx.window.expected = row;
  run('weeklyFilters={status:window.expected.status,brand:window.expected.brand,theme:window.expected.theme};drawWeekly()');
  assert(run('weeklyRows().some(x => x.id === window.expected.id)'));
  run('csv=(name,rows)=>window.exported=rows;exportWeekly();showWeeklyDetail(window.expected.id)');
  assert.equal(ctx.window.exported.length, run('weeklyRows().length') + 1);
  assert(ctx.window.exported.slice(1).every(r => r[9] && r[11]));
  assert(el('#weeklyDetail').open);
}
// Replay the first edition to protect inline and shared gallery export behavior.
ctx.window.ATLAS_WEEKLY=JSON.parse(fs.readFileSync(path.join(__dirname,'weekly-2026-11-03.json')));
run('weeklyFilters={status:"",brand:"",theme:""}');
assert.equal(run('weeklyRows().length'),6);
assert(run('window.ATLAS_WEEKLY.items.every(x=>weeklyPhoto(x)?.imageUrl?.startsWith("https://"))'));
run('weeklyFilters={status:"Dated launch",brand:"",theme:""};drawWeekly()');assert.equal(run('weeklyRows().length'),2);
run('weeklyFilters={status:"Planned release",brand:"",theme:""};drawWeekly()');assert.equal(run('weeklyRows()[0].brand'),"BRIEFING");
run('csv=(name,rows)=>window.exported=rows;exportWeekly()');assert.equal(ctx.window.exported.length,2);assert.equal(ctx.window.exported[0].length,12);assert(ctx.window.exported[1][9].includes('fastly.net'));assert(ctx.window.exported[1][11].includes('imn.jp'));
run('weeklyFilters.brand="TUMI";drawWeekly()');assert.equal(run('weeklyRows().length'),0);assert(el('#weeklyCards').innerHTML.includes('No matching releases'));
run('weeklyFilters={status:"",brand:"",theme:"Color & coordination"};drawWeekly()');assert.equal(run('weeklyRows().length'),3);
run('weeklyFilters={status:"",brand:"",theme:""};drawWeekly();exportWeekly()');assert.equal(ctx.window.exported.length,7);assert(ctx.window.exported.slice(1).every(r=>r[9]&&r[11]));
run('window.ATLAS_WEEKLY.items.forEach(x=>showWeeklyDetail(x.id))');assert(el('#weeklyDetailBody').innerHTML.includes('The Standard'));assert(el('#weeklyDetail').open);
vm.runInContext(fs.readFileSync(path.join(__dirname,'weekly-photo-assets.js'),'utf8'),ctx);assert(ctx.window.ATLAS_PHOTO_IMAGES.weekly2.startsWith('data:image/jpeg;base64,'));
console.log('PASS: all six launch photos resolve; combined dropdowns, empty/reset state, six detail views and filtered CSV with every photo/source URL.');

// Retired opportunity hypotheses remain research data, never public news UI or CSV.
for (const weekly of [edition,ctx.window.ATLAS_WEEKLY]) {
  ctx.window.ATLAS_WEEKLY=JSON.parse(JSON.stringify(weekly));
  ctx.window.ATLAS_WEEKLY.items.forEach(x=>x.implication='RETIRED_OPPORTUNITY_SENTINEL');
  ctx.window.ATLAS_WEEKLY.analysis=[{title:'RETIRED_ANALYSIS_SENTINEL',evidence:'RETIRED_ANALYSIS_SENTINEL',opportunity:'RETIRED_ANALYSIS_SENTINEL',next:'RETIRED_ANALYSIS_SENTINEL',source:'https://example.com/retired'}];
  run('weeklyFilters={status:"",brand:"",theme:""};drawWeekly();exportWeekly()');
  const output=[run('weeklyDashboard()'),el('#weeklyCards').innerHTML,JSON.stringify(ctx.window.exported)];
  for (const row of ctx.window.ATLAS_WEEKLY.items) {
    ctx.window.expected=row;run('showWeeklyDetail(window.expected.id)');
    const detail=el('#weeklyDetailBody').innerHTML;output.push(detail);
    assert(detail.includes(run('E(window.expected.source)')),'Keep exact news source');
    assert(detail.includes(row.date),'Keep source date');
  }
  assert.doesNotMatch(output.join('\n'),/Open Story opportunity|Implications for Open Story|RETIRED_(?:OPPORTUNITY|ANALYSIS)_SENTINEL/);
  assert(!ctx.window.exported[0].includes('Analysis'));
  assert(ctx.window.exported[0].includes('Source')&&ctx.window.exported[0].includes('Photo URL'));
}
console.log('PASS: current and archived weekly news retain facts, photos and sources without retired opportunity UI or CSV.');
