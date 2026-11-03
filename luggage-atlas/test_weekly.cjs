const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const elements=new Map(),saved=new Map();const el=k=>{if(!elements.has(k))elements.set(k,{innerHTML:'',textContent:'',hidden:false,dataset:{},style:{},addEventListener(){},setAttribute(){},showModal(){this.open=true},close(){this.open=false}});return elements.get(k)};
const ctx={window:{addEventListener(){},scrollTo(){}},document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({click(){}})},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},location:{hash:'#overview'},setTimeout(){},URL:{createObjectURL(){return''},revokeObjectURL(){}},Blob:function(){},console};vm.createContext(ctx);
for(const name of ['data.js','photos.js','weekly.js','atlas-upgrade.js','fashion.js','fashion-ui.js','innovation.js','innovation-ui.js','workbench.js','tutorial.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx);
function run(code){return vm.runInContext(code,ctx)}

assert.equal(run('weeklyRows().length'),6);
assert(run('window.ATLAS_WEEKLY.items.every(x=>weeklyPhoto(x)?.imageUrl?.startsWith("https://"))'));
run('weeklyFilters={status:"Dated launch",brand:"",theme:""};drawWeekly()');assert.equal(run('weeklyRows().length'),2);
run('weeklyFilters={status:"Planned release",brand:"",theme:""};drawWeekly()');assert.equal(run('weeklyRows()[0].brand'),"BRIEFING");
run('csv=(name,rows)=>window.exported=rows;exportWeekly()');assert.equal(ctx.window.exported.length,2);assert.equal(ctx.window.exported[0].length,13);assert(ctx.window.exported[1][10].includes('fastly.net'));assert(ctx.window.exported[1][12].includes('imn.jp'));
run('weeklyFilters.brand="TUMI";drawWeekly()');assert.equal(run('weeklyRows().length'),0);assert(el('#weeklyCards').innerHTML.includes('No matching releases'));
run('weeklyFilters={status:"",brand:"",theme:"Color & coordination"};drawWeekly()');assert.equal(run('weeklyRows().length'),3);
run('weeklyFilters={status:"",brand:"",theme:""};drawWeekly();exportWeekly()');assert.equal(ctx.window.exported.length,7);assert(ctx.window.exported.slice(1).every(r=>r[10]&&r[12]));
run('window.ATLAS_WEEKLY.items.forEach(x=>showWeeklyDetail(x.id))');assert(el('#weeklyDetailBody').innerHTML.includes('The Standard'));assert(el('#weeklyDetail').open);
vm.runInContext(fs.readFileSync(path.join(__dirname,'weekly-photo-assets.js'),'utf8'),ctx);assert(ctx.window.ATLAS_PHOTO_IMAGES.weekly2.startsWith('data:image/jpeg;base64,'));
console.log('PASS: all six launch photos resolve; combined dropdowns, empty/reset state, six detail views and filtered CSV with every photo/source URL.');
