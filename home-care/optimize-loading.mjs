import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { addSalesRanking } from './sales-ranking-build.mjs';
import { addBrandFactories, addFactoryInterface } from './brand-factory-build.mjs';
const file=process.argv[2]||'home-care/site/index.html';
let html=fs.readFileSync(file,'utf8');
if(html.includes('id="catalog-loading"')){console.log('Loading optimization already applied');process.exit(0)}
const start=html.indexOf('const ITEMS=')+12,end=html.indexOf(';\nconst COVERAGE=',start);
if(start<12||end<start)throw Error('Original catalog dataset not found');
const items=JSON.parse(html.slice(start,end));
const additionsFile=path.join(path.dirname(file),'catalog-additions.json');
const additions=fs.existsSync(additionsFile)?JSON.parse(fs.readFileSync(additionsFile,'utf8')):[];
const reviewDir=path.join(path.dirname(file),'catalog-review');
const review=fs.existsSync(path.join(reviewDir,'index.json'))?JSON.parse(fs.readFileSync(path.join(reviewDir,'index.json'),'utf8')):null;
if(review)for(const part of review.files)additions.push(...JSON.parse(fs.readFileSync(path.join(reviewDir,part),'utf8')));
if(review?.photoPacks){const photoDir=path.join(path.dirname(file),'research-photos');fs.mkdirSync(photoDir,{recursive:true});for(const pack of review.photoPacks){const photos=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(reviewDir,pack))));for(const [name,data] of Object.entries(photos)){assert.match(name,/^[a-f0-9]{24}\.jpg$/);fs.writeFileSync(path.join(photoDir,name),Buffer.from(data,'base64'));}}}
const checkedAt=review?.reviewedAt||'2026-10-31';
const weekStart=new Date(checkedAt+'T00:00:00Z');weekStart.setUTCDate(weekStart.getUTCDate()-((weekStart.getUTCDay()+6)%7));
const since=weekStart.toISOString().slice(0,10);
const originalIds=new Set(items.map(d=>d.id));
for(const d of additions){assert.ok(d.id&&d.name&&d.url&&d.image&&d.category&&d.retailer);if(!originalIds.has(d.id)){items.push(d);originalIds.add(d.id)}}
// Add evidence-backed category memberships without duplicating or reclassifying SKUs.
const crossFile=path.join(reviewDir,'category-cross-listings.json');
const cross=fs.existsSync(crossFile)?JSON.parse(fs.readFileSync(crossFile,'utf8')):[];
for(const patch of cross){const record=items.find(d=>d.id===patch.id);assert.ok(record,'Cross-listing ID missing: '+patch.id);for(const [key,value] of Object.entries(patch)){if(key!=='id'){assert.ok(!Object.hasOwn(record,key),'Cross-listing must not overwrite retained field '+key);record[key]=value}}}
// Keep reference records, but distinguish them from individual item-page evidence.
for(const d of items){
 const u=new URL(d.url);
 const broad=/\/(?:s|clp|b|browse|category|categories|collections|search|zgbs)(?:\/|$)/i.test(u.pathname)||u.searchParams.has('k')||u.searchParams.has('rh');
 d.evidenceLevel=d.evidenceLevel||(broad?'Search / category reference':/indexed|access issue|metadata/i.test(d.verificationStatus||'')?'Indexed / limited evidence':'Individual item link');
}
assert.ok(items.length>=6265, "Existing catalog records must be preserved");
const factoryStats=addBrandFactories(items,path.dirname(file));
const keys=[...new Set(items.flatMap(Object.keys))],pool=[],lookup=new Map();
const rows=items.map(item=>keys.map(k=>{if(!Object.hasOwn(item,k))return -1;const v=item[k],signature=JSON.stringify(v);if(!lookup.has(signature)){lookup.set(signature,pool.length);pool.push(v)}return lookup.get(signature)}));
const decoded=rows.map(r=>Object.fromEntries(keys.flatMap((k,i)=>r[i]<0?[]:[[k,pool[r[i]]]])));
assert.deepEqual(decoded,items);
const packed=JSON.stringify({keys,pool,rows}).replaceAll('<','\\u003c');
const expression='(()=>{const p='+packed+';return p.rows.map(r=>Object.fromEntries(p.keys.flatMap((k,i)=>r[i]<0?[]:[[k,p.pool[r[i]]]])))})()';
html=html.slice(0,start)+expression+html.slice(end);
// Remove a copied legacy-host challenge script; it does not belong to GitHub Pages.
html=html.replace(/<script>\(function\(\)\{function c\(\)\{var b=a\.contentDocument[\s\S]*?<\/script>/g,'');
html=html.replace("const filters=['brand'", `const evidenceField=document.createElement('label');evidenceField.innerHTML='Evidence<select id="evidence-level"><option value="all">All evidence</option><option>Individual item link</option><option>Indexed / limited evidence</option><option>Search / category reference</option></select>';$('verification').parentElement.after(evidenceField);
const filters=['evidence-level','brand'`);
html=html.replace("[['brand','brand']", "[['evidence-level','evidenceLevel'],['brand','brand']");
html=html.replace("const body=c.querySelector('.body'),facts=c.querySelector('.card-facts');", `const body=c.querySelector('.body'),facts=c.querySelector('.card-facts');
 const evidence=document.createElement('p');evidence.className='scope-label';evidence.textContent=d.evidenceLevel+(d.evidenceLevel==='Individual item link'?' · availability varies':' · current offer unverified');info.prepend(evidence);`);
html=html.replace("details.prepend(dates);", `details.prepend(dates);const proof=document.createElement('p');proof.textContent=d.verificationNote||d.evidence||'';details.append(proof);`);
html=html.replace("'photoVerification','url','listingSource'", "'photoVerification','image','evidenceLevel','verificationStatus','checkedDate','url','listingSource'");
html=html.replace("photoVerification:'Photo note'", "image:'Product image URL',evidenceLevel:'Evidence level',verificationStatus:'Verification status',checkedDate:'Source checked date',photoVerification:'Photo note'");
html=html.replace("quote((f==='salesPeriod'", "quote(f==='image'?((value)=>{if(!value)return '';try{const url=new URL(value,location.href);return ['http:','https:'].includes(url.protocol)?url.href:''}catch{return ''}})(d.image||cached.get(d.id)?.querySelector('img')?.getAttribute('src')||''):(f==='salesPeriod'");
html=html.replace(".toLocaleString()+' '+(rows.length===1?'item':'items')", ".toLocaleString()+' '+(rows.length===1?'record':'records')");
const original=html.match(/<template id="original-cards">([\s\S]*?)<\/template>/)[1];
const images=new Map([...original.matchAll(/<article[^>]*data-id="([^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"/g)].map(m=>[m[1],m[2]]));
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const first=items.filter(d=>d.merchantScope==='Home Care').sort((a,b)=>(b.retailerListedDate||'').localeCompare(a.retailerListedDate||'')||(a.brand||'\uffff').localeCompare(b.brand||'\uffff')||a.name.localeCompare(b.name)).slice(0,48);
const cards=first.map(d=>'<article class="card" data-id="'+escape(d.id)+'" data-retailer="'+escape(d.retailer)+'"><div class="photo"><img loading="lazy" decoding="async" src="'+escape(images.get(d.id)||d.image)+'" alt="'+escape(d.name)+'"></div><div class="body"><div class="card-meta">'+escape(d.retailer)+(d.brand?' · '+escape(d.brand):'')+'</div><h3>'+escape(d.name)+'</h3><p class="card-category">'+escape(d.categoryLabel)+'</p><div class="card-facts">'+(d.displayPrice?'<div class="price">'+escape(d.displayPrice)+'</div>':'')+(d.hasSales?'<div class="sales-count">'+escape(d.displaySales)+'</div>':'')+'</div><div class="actions"><a class="view" href="'+escape(d.url)+'" target="_blank" rel="noopener noreferrer">View item</a><button type="button" disabled>Select</button><button type="button" disabled>Details</button></div></div></article>').join('');
const loading='<p id="catalog-loading" role="status" style="padding:12px 16px;background:#fff7e6;border-radius:10px">Loading filters for all products… You can browse the products below while they load.</p><noscript><p>Enable JavaScript to filter all products and export selections.</p></noscript>';
html=html.replace('<div class="grid" id="product-grid"></div>',loading+'<div class="grid" id="product-grid">'+cards+'</div>');
html=html.replace("brandOptions('all');categoryOptions();draw();","brandOptions('all');categoryOptions();draw();$('catalog-loading').hidden=true;");
const catchErrors='<script>window.addEventListener("error",function(){var n=document.getElementById("catalog-loading");if(n&&!n.hidden){n.textContent="Products are available below. Filters did not finish loading; please reload this page.";}});</script>';
html=html.replace('<script>const ITEMS=',catchErrors+'<script>const ITEMS=');
assert.equal((html.match(/id="catalog-loading"/g)||[]).length,1);
html=html.replace('</head>','<link rel="stylesheet" href="/home-care/weekly-dashboard.css">\n</head>').replace('</body>','<script src="/home-care/weekly-dashboard.js"></script>\n</body>');
const counts=Object.fromEntries([...new Set(items.map(d=>d.retailer))].map(r=>[r,items.filter(d=>d.retailer===r).length]));
html=html.replace('U.S. HOME CARE · 27 OCTOBER 2026','U.S. HOME CARE · UPDATED '+checkedAt);
html=html.replace(/6,265 items/g,items.length.toLocaleString('en-US')+' records');
html=html.replace(/(<script[^>]*id="weekly-data"[^>]*>)([\s\S]*?)(<\/script>)/,(_,a,j,b)=>{const w=JSON.parse(j);w.checkedAt=checkedAt;w.newItemIds=additions.filter(d=>d.datePosted>=since&&d.datePosted<=checkedAt).map(d=>d.id);return a+JSON.stringify(w)+b});
html=html.replace('Checked 27 October 2026.',"Checked '+esc(d.checkedDate||'2026-10-27')+'.");
html=html.replace('const COVERAGE=', 'const COVERAGE=');
const covStart=html.indexOf('const COVERAGE=')+15,covEnd=html.indexOf(';\n',covStart);
const coverage=JSON.parse(html.slice(covStart,covEnd));
for(const r of Object.keys(counts)){if(coverage[r])coverage[r].note=counts[r]+' collected listings. Partial coverage, not the retailer’s full inventory.'+(additions.some(d=>d.retailer===r)?' Latest collected evidence dated '+additions.filter(d=>d.retailer===r).map(d=>d.checkedDate||'').filter(Boolean).sort().at(-1)+'.':' Existing records retained; more product research needed.');}
html=html.slice(0,covStart)+JSON.stringify(coverage)+html.slice(covEnd);
html=html.replace('No matching products.', 'No collected listings match these filters. An empty category does not mean the retailer stocks no products.');
// Secondary category membership is searchable and exportable; primary category stays intact.
assert.ok(html.includes("cat==='all'||d.category===cat"));
html=html.replace("cat==='all'||d.category===cat","cat==='all'||d.category===cat||(d.secondaryCategories||[]).includes(cat)");
html=html.replace(".map(d=>d.category));$('category')",".flatMap(d=>[d.category,...(d.secondaryCategories||[])]));$('category')");
// Make cross-listings visible on cards without modifying retained category fields.
assert.ok(html.includes('esc(d.categoryLabel)'));
html=html.replaceAll('esc(d.categoryLabel)', "esc(d.categoryLabel+(d.secondaryCategories?.length?' · Also: '+d.secondaryCategories.join(', '):''))");
html=html.replace("esc(d.photoVerification)", "esc(d.photoVerification)+(d.categoryEvidenceNote?'<br>Category evidence checked '+esc(d.coverageVerifiedDate)+': '+esc(d.categoryEvidenceNote)+' '+link(d.categoryEvidenceSource,'Category source'):'')");
html=addSalesRanking(html);
assert.equal(html.split("const fields=['salesRankInView'").length-1,1,'Target CSV integration changed');
html=html.replace("const fields=['salesRankInView'", "const fields=['targetInspirationRole','targetInspirationIdeas','targetFeatureToLearn','targetProposedConcept','targetValidationSteps','targetInspirationSources','salesRankInView'");
html=html.replace("const headers={salesRankInView:","const headers={targetInspirationRole:'Target inspiration role',targetInspirationIdeas:'Target inspiration ideas',targetFeatureToLearn:'Target baseline or feature to learn',targetProposedConcept:'Proposed Target concept (hypothesis)',targetValidationSteps:'Target validation questions',targetInspirationSources:'Target inspiration source links',salesRankInView:");
// Target and external travel references live outside ITEMS but remain exportable and visible in Saved.
assert.equal(html.split('let rows=ITEMS.filter(d=>').length-1,1,'Selected records integration changed');
html=html.replace('let rows=ITEMS.filter(d=>','let rows=(savedOnly?[...byId.values()]:ITEMS).filter(d=>');
// Merchant analysis uses the same merged records and shared product selections.
assert.equal(html.split('<script src="/home-care/opportunities.js"></script>').length-1,1,'Opportunity script integration changed');
html=html.replace('<script src="/home-care/opportunities.js"></script>','<script src="/home-care/opportunity-model.js"></script>\n<script src="/home-care/opportunities.js"></script>');
html=html.replace('</head>','<link rel="stylesheet" href="/home-care/merchant-analytics.css">\n<link rel="stylesheet" href="/home-care/product-compare.css">\n<link rel="stylesheet" href="/home-care/target-inspiration.css">\n</head>');
html=html.replace('</body>','<script src="/home-care/merchant-analytics-model.js"></script>\n<script src="/home-care/merchant-analytics.js"></script>\n<script src="/home-care/target-inspiration-data.js"></script>\n<script src="/home-care/target-inspiration.js"></script>\n<script src="/home-care/product-compare.js"></script>\n<script>window.HCMerchantAnalytics.mount(ITEMS);window.HCTargetInspiration.mount({items:ITEMS,byId,cached,picks,redraw:draw});window.HCProductCompare.mount({items:ITEMS,byId,cached,picks,redraw:draw,onShow:()=>{showCatalogView(false);document.getElementById("executive-view").hidden=true;document.getElementById("nav-opportunities").setAttribute("aria-pressed","false");},onBrowse:()=>showCatalogView(true)});</script>\n</body>');
for(const asset of ['weekly-dashboard.js','weekly-dashboard.css','opportunities.js','opportunities.css','opportunity-model.js','merchant-analytics-model.js','merchant-analytics.js','merchant-analytics.css','product-compare.js','product-compare.css','target-inspiration-data.js','target-inspiration.js','target-inspiration.css','sales-ranking-model.js','sales-ranking.js','sales-ranking.css']){const source=path.join(path.dirname(file),asset);if(fs.existsSync(source)){const version=crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex').slice(0,12);html=html.replaceAll('/home-care/'+asset,'/home-care/'+asset+'?v='+version)}}
html=html.replace("const fields=['", "const fields=['secondaryCategories','coverageBrand','coverageSize','coverageVerifiedDate','categoryEvidenceSource','categoryEvidenceNote','observedPrice','observedPriceSource','observedPriceNote','priceObservedDate','size','");
html=html.replace("const headers={", "const headers={secondaryCategories:'Also listed in',coverageBrand:'Verified brand',coverageSize:'Verified size',coverageVerifiedDate:'Coverage verification date',categoryEvidenceSource:'Category evidence URL',categoryEvidenceNote:'Category evidence note',observedPrice:'Observed USD price',observedPriceSource:'Observed price source',observedPriceNote:'Observed price limitations',priceObservedDate:'Price evidence retrieved date',size:'Size / pack',");
html=addFactoryInterface(html);
fs.writeFileSync(file,html);
console.log(JSON.stringify({factoryStats}));
console.log(JSON.stringify({records:items.length,initialCards:first.length,bytes:Buffer.byteLength(html),originalDataBytes:end-start,packedDataBytes:Buffer.byteLength(expression),lossless:true}));



