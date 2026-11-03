const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const elements=new Map(),saved=new Map();const el=k=>{if(!elements.has(k))elements.set(k,{innerHTML:'',textContent:'',hidden:false,dataset:{},style:{},addEventListener(){},setAttribute(){},showModal(){this.open=true},close(){this.open=false}});return elements.get(k)};
const ctx={window:{addEventListener(){},scrollTo(){}},document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({click(){}})},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},location:{hash:'#workbench'},setTimeout(){},URL:{createObjectURL(){return''},revokeObjectURL(){}},Blob:function(){},console};vm.createContext(ctx);
for(const name of ['data.js','photos.js','weekly.js','atlas-upgrade.js','fashion.js','fashion-ui.js','innovation.js','innovation-ui.js','workbench.js','tutorial.js','offer-photos.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx);
function run(code){return vm.runInContext(code,ctx)}

const data=JSON.parse(fs.readFileSync(path.join(__dirname,'data.json'))),photos=JSON.parse(fs.readFileSync(path.join(__dirname,'photos.json')));
assert.equal(photos.offerAudits.length,9);
assert.equal(photos.photos.filter(p=>p.offerId).length,33);
const exportRows=[];
for(const audit of photos.offerAudits){
 const offer=run(`offers().find(p=>p.id===${JSON.stringify(audit.offerId)})`);assert(offer);
 assert.equal(run(`offerPhotoRows(${JSON.stringify(offer)}).length`),audit.photoIds.length);
 assert.equal(run(`offerPhotoAudit({...${JSON.stringify(offer)},amount:1,date:'2027-01-01'}).offerId`),audit.offerId);
 assert.equal(run(`offerPhotoAudit({...${JSON.stringify(offer)},product:'Different size'})`),undefined);
 const gallery=run(`offerPhotoEvidence(${JSON.stringify(offer)})`);
 assert(gallery.includes('data-offer-gallery'));
 run(`itemSelection=new Set([${JSON.stringify(audit.offerId)}]);csv=(name,rows)=>window.exportRows=rows;exportDesk()`);
 const [headers,row]=ctx.window.exportRows;assert.equal(row.length,headers.length);
 const r=Object.fromEntries(headers.map((h,i)=>[h,row[i]]));assert.equal(r['Exact priced product'],offer.product);
 assert(r['Exterior photo URL']);assert.equal(r['Photo checked date'],'2026-11-04');
 const evidence=JSON.parse(r['Photo evidence JSON']);assert.equal(evidence.length,audit.photoIds.length);
 assert(evidence.every(x=>x.url&&x.source&&x.status&&x.scope));
 if(offer.brand==='Assembly'){assert.equal(r['Interior photo URL'],'');assert(r['Collection alternative photo URLs']);assert(gallery.includes('Main interior photo not verified'));}
 else assert(r['Interior photo URL']);
 if(offer.brand==='Skybags'){assert.match(r['Photo verification status'],/offer color unspecified/);assert.match(r['Remaining image gaps'],/does not specify color/);}
 for(const id of audit.photoIds){const photo=photos.photos.find(p=>p.id===id);assert.equal(photo.offerId,audit.offerId);assert(fs.existsSync(path.join(__dirname,photo.localPath)));}
 if(!exportRows.length)exportRows.push(headers);exportRows.push(row);
}
assert.equal(run("representativePhoto(brandBy('Samsonite'),'Interior').offerId"),'offer-a8bb8cf6');
assert.equal(run("representativePhoto(brandBy('Assembly'),'Interior')"),undefined);
// An unreviewed offer must not inherit an exact interior by brand.
assert.equal(run('offerPhotoExport(offers()[0])[1]'),'');
assert(run('offerPhotoExport(offers()[0])[16]').length>0);
// Brand gallery preserves all three Samsonite models separately.
assert.equal(run("brandOfferPhotos(brandBy('Samsonite')).length"),3);
run("photoFilters.q='Samsonite';drawPhotos()");
assert(el('#photoCards').innerHTML.includes('FLATFORM'));assert(el('#photoCards').innerHTML.includes('Upscape'));
// Original photo-reference export also carries offer identity and match status.
run("selected=new Set(['samsonite']);bindPhotos();$('#photoExport').onclick()");
assert(ctx.window.exportRows[0].includes('Verification status'));
assert(ctx.window.exportRows.every(x=>x.length===ctx.window.exportRows[0].length));
run("selected=new Set(['samsonite','assembly']);exportBrands()");
assert(ctx.window.exportRows.every(x=>x.length===ctx.window.exportRows[0].length));
assert(ctx.window.exportRows[0].includes('Per-image verification JSON'));
if(process.env.PHOTO_AUDIT_EXPORT){const safe=v=>'"'+String(v??'').replace(/"/g,'""')+'"';fs.writeFileSync(process.env.PHOTO_AUDIT_EXPORT,'\ufeff'+exportRows.map(r=>r.map(safe).join(',')).join('\r\n'));}
console.log('PASS: nine offer identities, 33 images, variant/date isolation, collection alternatives, unknown color, comparison resolution, sources and CSV columns.');
