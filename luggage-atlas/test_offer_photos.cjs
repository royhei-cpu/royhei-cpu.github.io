const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const elements=new Map(),saved=new Map();const el=k=>{if(!elements.has(k))elements.set(k,{innerHTML:'',textContent:'',hidden:false,dataset:{},style:{},addEventListener(){},setAttribute(){},showModal(){this.open=true},close(){this.open=false}});return elements.get(k)};
const ctx={window:{addEventListener(){},scrollTo(){}},document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({click(){}})},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},location:{hash:'#workbench'},setTimeout(){},URL:{createObjectURL(){return''},revokeObjectURL(){}},Blob:function(){},console};vm.createContext(ctx);
for(const name of ['data.js','photos.js','weekly.js','atlas-upgrade.js','fashion.js','fashion-ui.js','innovation.js','innovation-ui.js','workbench.js','model-evidence.js','model-catalog.js','tutorial.js','offer-photos.js','directory.js','app.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx);
function run(code){return vm.runInContext(code,ctx)}
run('window.actualCsv=csv');

const data=JSON.parse(fs.readFileSync(path.join(__dirname,'data.json'))),photos=JSON.parse(fs.readFileSync(path.join(__dirname,'photos.json')));
assert.equal(photos.offerAudits.length,9);
assert.equal(photos.photos.filter(p=>p.offerId).length,35);
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
 if(offer.brand!=='Skybags')assert(r['Exterior photo URL']);assert.equal(r['Photo checked date'],'2026-11-04');
 const evidence=JSON.parse(r['Photo evidence JSON']);assert.equal(evidence.length,audit.photoIds.length);
 assert(evidence.every(x=>x.url&&x.source&&x.status&&x.scope));
 if(offer.brand==='Assembly'){assert.equal(r['Interior photo URL'],'');assert(r['Collection alternative photo URLs']);assert(gallery.includes('Main interior photo not verified'));}
 else if(offer.brand!=='Skybags')assert(r['Interior photo URL']);
 if(offer.brand==='Skybags'){
  assert.match(r['Photo verification status'],/offer color unspecified/);assert.match(r['Remaining image gaps'],/does not specify color/);
  assert.equal(r['Exterior photo URL'],'');assert.equal(r['Interior photo URL'],'');
  assert(r['Color-unverified exterior photo URLs']);assert(r['Color-unverified interior photo URLs']);
  assert.equal(r['All color-unverified photo URLs'].split(' | ').length,4);
  assert(gallery.includes('offer color unspecified'));assert(gallery.includes('offer-skybags-5.jpg'));
 }
 if(offer.brand==='Safari'){
  assert.equal(r['Detail photo URLs'].split(' | ').length,2);
  assert(r['Photo SKU / item ID'].includes('AEROLITE554WBLK'));
 }
 if(offer.brand==='Assembly')assert(r['Photo SKU / item ID'].includes('rover-pro-moon-white20'));
 assert.equal(r['Bundled photo asset paths'].split(' | ').length,audit.photoIds.length);
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
// Missing/unsupported statuses and mismatched offer IDs must never become exact matches.
run("window.mutationPhoto=window.ATLAS_PHOTOS.photos.find(x=>x.id==='offer-samsonite-1');window.savedPhoto=JSON.parse(JSON.stringify(window.mutationPhoto))");
for(const status of [null,'unavailable','unverified']){
 run(`window.mutationPhoto.verificationStatus=${JSON.stringify(status)}`);
 assert.equal(run("offerView(offers().find(p=>p.id==='offer-a8bb8cf6'),'Exterior')"),undefined);
 assert.equal(run("offerPhotoExport(offers().find(p=>p.id==='offer-a8bb8cf6'))[0]"),'');
}
run("Object.assign(window.mutationPhoto,window.savedPhoto);window.mutationPhoto.offerId='offer-wrong-product'");
assert.equal(run("offerView(offers().find(p=>p.id==='offer-a8bb8cf6'),'Exterior')"),undefined);
run('Object.assign(window.mutationPhoto,window.savedPhoto)');
// Every expanded gallery uses its own complete image set, local paths, labels and sources.
for(const audit of photos.offerAudits){
 run(`showOfferPhotos(${JSON.stringify(audit.offerId)})`);
 const html=el('#photoLightboxBody').innerHTML;
 for(const id of audit.photoIds){const p=photos.photos.find(x=>x.id===id);assert(html.includes(p.localPath));assert(html.includes('Photo source'));}
 assert(html.includes('Remaining image gaps'));
}
if(process.env.PHOTO_AUDIT_EXPORT){const safe=v=>'"'+String(v??'').replace(/"/g,'""')+'"';fs.writeFileSync(process.env.PHOTO_AUDIT_EXPORT,'\ufeff'+exportRows.map(r=>r.map(safe).join(',')).join('\r\n'));}
// Exercise the actual download serializer, including CSV quoting, rather than only row stubs.
ctx.Blob=function(parts){ctx.window.downloadedCsv=parts.join('')};
run("csv=window.actualCsv;itemSelection=new Set(['offer-1730d13','offer-39bdd129','offer-baa5a155','offer-a8bb8cf6']);exportDesk()");
assert(ctx.window.downloadedCsv.startsWith('\ufeff'));
assert(ctx.window.downloadedCsv.includes('Color-unverified exterior photo URLs'));
assert(ctx.window.downloadedCsv.includes('AEROLITE554WBLK'));
assert(ctx.window.downloadedCsv.includes('AeroliteAmazonPDP5-100'));
assert(ctx.window.downloadedCsv.includes('AeroliteAmazonPDP6-100'));
assert(!ctx.window.downloadedCsv.includes('100000001010283165'));
if(process.env.PHOTO_SELECTED_EXPORT)fs.writeFileSync(process.env.PHOTO_SELECTED_EXPORT,ctx.window.downloadedCsv);
console.log('PASS: nine offer identities, 35 images, gallery markup, variant/date isolation, strict match states, cross-offer isolation, qualified color columns, sources and CSV alignment.');
